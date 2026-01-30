/**
 * FOGO AutoSwap Bot
 * Flow: FOGO → USDC → FOGO (repeat with delay)
 */

import 'dotenv/config';
import bs58 from 'bs58';
import {
    Connection,
    Keypair,
    PublicKey,
    Transaction,
    SystemProgram,
    sendAndConfirmTransaction,
    ComputeBudgetProgram,
} from '@solana/web3.js';
import {
    getAssociatedTokenAddressSync,
    createAssociatedTokenAccountInstruction,
    createSyncNativeInstruction,
    createCloseAccountInstruction,
    TOKEN_PROGRAM_ID,
    ASSOCIATED_TOKEN_PROGRAM_ID,
    getAccount,
} from '@solana/spl-token';
import * as anchor from '@coral-xyz/anchor';

// ============================================================================
// KONSTANTA
// ============================================================================
const VORTEX_PROGRAM_ID = new PublicKey('vnt1u7PzorND5JjweFWmDawKe2hLWoTwHU6QKz6XX98');
const MINT_WFOGO = new PublicKey('So11111111111111111111111111111111111111112');
const MINT_USDC = new PublicKey('uSd2czE61Evaf76RNbq4KPpXnkiL3irdzgLFUMe3NoG');

// Pool accounts (dari analisis transaksi)
const POOL_ADDRESS = new PublicKey('29RpgcYJweTy9BUXPcETH64hkvEs2EMvfEyZbBMuq3NM');
const VORTEX_POSITION = new PublicKey('J7mxBLSz51Tcbog3XsiJTAXS64N46KqbpRGQmd3dQMKp');
const VAULT_WFOGO = new PublicKey('5Hi57na7wCbQ2b7D3QXRPAy9b4tsT1S5WWeXJ7WcDga7');
const VAULT_USDC = new PublicKey('Dfyuf7jjpZ1xSKSBTYLc8i6HGBnrEn8429b9ziDDgNBo');
const TICK_ARRAY_0 = new PublicKey('Cd74Jx1qwBw6vpqqRGkyKk11GdqGoJiPVX9gpzZdMv7o');
const TICK_ARRAY_1 = new PublicKey('AKCcDG4vPoTTd1k745Q4zYJXqyVSMvhyxMC8oerZKdTQ');
const TICK_ARRAY_2 = new PublicKey('6bqfhSF8DLShXZjM7gVfeTvZRKVjyJqzLAVsRi3jpvo4');
const ORACLE = new PublicKey('3Kdtda8zcXjuC6n69xfuXtyZt2kEwLE6ghvubGbKfsFv');

// Config
const RPC_URL = process.env.RPC_URL || 'https://mainnet.fogo.io';
const PRIVATE_KEY = process.env.PRIVATE_KEY;
const SWAP_PERCENT = 80; // Swap 80% of FOGO balance
const DELAY_MIN_MINUTES = parseInt(process.env.DELAY_MIN || '5', 10);
const DELAY_MAX_MINUTES = parseInt(process.env.DELAY_MAX || '10', 10);

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function loadWalletFromPrivateKey(privateKey) {
    if (!privateKey) {
        console.error('❌ PRIVATE_KEY tidak ditemukan di .env!');
        console.log('   Tambahkan: PRIVATE_KEY=your_base58_private_key');
        process.exit(1);
    }

    try {
        // Try base58 format first (most common)
        const decoded = bs58.decode(privateKey);
        return Keypair.fromSecretKey(decoded);
    } catch {
        try {
            // Try JSON array format
            const parsed = JSON.parse(privateKey);
            return Keypair.fromSecretKey(Uint8Array.from(parsed));
        } catch {
            console.error('❌ Format private key tidak valid!');
            console.log('   Gunakan format base58 atau JSON array');
            process.exit(1);
        }
    }
}

function randomDelay(minMinutes, maxMinutes) {
    const min = minMinutes * 60 * 1000;
    const max = maxMinutes * 60 * 1000;
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function getTokenBalance(connection, owner, mint) {
    try {
        const ata = getAssociatedTokenAddressSync(mint, owner, false, TOKEN_PROGRAM_ID);
        const account = await getAccount(connection, ata);
        return account.amount;
    } catch {
        return 0n;
    }
}

async function printBalances(connection, wallet) {
    const fogoBalance = await connection.getBalance(wallet);
    const usdcBalance = await getTokenBalance(connection, wallet, MINT_USDC);

    console.log('\n💰 Balances:');
    console.log(`   FOGO: ${(fogoBalance / 1e9).toFixed(4)}`);
    console.log(`   USDC: ${(Number(usdcBalance) / 1e6).toFixed(4)}`);

    return { fogoBalance, usdcBalance };
}

// ============================================================================
// SWAP FUNCTIONS
// ============================================================================

/**
 * Swap FOGO → USDC
 * Wrap FOGO → Swap → Unwrap remaining
 */
async function swapFogoToUsdc(connection, wallet, amountFogo) {
    console.log(`\n🔄 Swapping ${amountFogo / 1e9} FOGO → USDC...`);

    const tx = new Transaction();
    const wFogoAta = getAssociatedTokenAddressSync(MINT_WFOGO, wallet.publicKey, false, TOKEN_PROGRAM_ID);
    const usdcAta = getAssociatedTokenAddressSync(MINT_USDC, wallet.publicKey, false, TOKEN_PROGRAM_ID);

    // Compute budget
    tx.add(ComputeBudgetProgram.setComputeUnitLimit({ units: 500000 }));
    tx.add(ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 1 }));

    // Create WFOGO ATA if needed
    const wFogoAtaInfo = await connection.getAccountInfo(wFogoAta);
    if (!wFogoAtaInfo) {
        tx.add(createAssociatedTokenAccountInstruction(
            wallet.publicKey, wFogoAta, wallet.publicKey, MINT_WFOGO,
            TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID
        ));
    }

    // Transfer FOGO to WFOGO ATA (wrap)
    tx.add(SystemProgram.transfer({
        fromPubkey: wallet.publicKey,
        toPubkey: wFogoAta,
        lamports: amountFogo,
    }));

    // Create USDC ATA if needed
    const usdcAtaInfo = await connection.getAccountInfo(usdcAta);
    if (!usdcAtaInfo) {
        tx.add(createAssociatedTokenAccountInstruction(
            wallet.publicKey, usdcAta, wallet.publicKey, MINT_USDC,
            TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID
        ));
    }

    // Sync Native (finalize wrap)
    tx.add(createSyncNativeInstruction(wFogoAta));

    // Build Swap instruction (FOGO → USDC, aToB = true)
    const discriminator = Buffer.from('f8c69e91e17587c8', 'hex');
    const swapData = Buffer.alloc(42);
    swapData.set(discriminator, 0);
    swapData.writeBigUInt64LE(BigInt(amountFogo), 8);
    swapData.writeBigUInt64LE(BigInt(1), 16); // Min output (1 = minimal slippage protection)
    swapData.fill(0, 24, 40);
    swapData.writeUInt8(1, 40); // aToB = true (FOGO → USDC)
    swapData.writeUInt8(1, 41);

    const swapKeys = [
        { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
        { pubkey: wallet.publicKey, isSigner: true, isWritable: true },
        { pubkey: VORTEX_POSITION, isSigner: false, isWritable: true },
        { pubkey: wFogoAta, isSigner: false, isWritable: true },
        { pubkey: VAULT_WFOGO, isSigner: false, isWritable: true },
        { pubkey: usdcAta, isSigner: false, isWritable: true },
        { pubkey: VAULT_USDC, isSigner: false, isWritable: true },
        { pubkey: POOL_ADDRESS, isSigner: false, isWritable: true },
        { pubkey: TICK_ARRAY_0, isSigner: false, isWritable: true },
        { pubkey: TICK_ARRAY_1, isSigner: false, isWritable: true },
        { pubkey: TICK_ARRAY_2, isSigner: false, isWritable: false },
        { pubkey: ORACLE, isSigner: false, isWritable: false },
    ];

    tx.add(new anchor.web3.TransactionInstruction({
        keys: swapKeys,
        programId: VORTEX_PROGRAM_ID,
        data: swapData,
    }));

    // Close WFOGO ATA (unwrap remaining)
    tx.add(createCloseAccountInstruction(
        wFogoAta, wallet.publicKey, wallet.publicKey, [], TOKEN_PROGRAM_ID
    ));

    const signature = await sendAndConfirmTransaction(connection, tx, [wallet]);
    console.log(`   ✅ Success! Tx: ${signature}`);
    return signature;
}

/**
 * Swap USDC → FOGO
 * Account order MUST be same as FOGO→USDC, only aToB flag changes
 */
async function swapUsdcToFogo(connection, wallet, amountUsdc) {
    console.log(`\n🔄 Swapping ${amountUsdc / 1e6} USDC → FOGO...`);

    const tx = new Transaction();
    const wFogoAta = getAssociatedTokenAddressSync(MINT_WFOGO, wallet.publicKey, false, TOKEN_PROGRAM_ID);
    const usdcAta = getAssociatedTokenAddressSync(MINT_USDC, wallet.publicKey, false, TOKEN_PROGRAM_ID);

    // Compute budget
    tx.add(ComputeBudgetProgram.setComputeUnitLimit({ units: 500000 }));
    tx.add(ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 1 }));

    // Create WFOGO ATA if needed (to receive FOGO)
    const wFogoAtaInfo = await connection.getAccountInfo(wFogoAta);
    if (!wFogoAtaInfo) {
        tx.add(createAssociatedTokenAccountInstruction(
            wallet.publicKey, wFogoAta, wallet.publicKey, MINT_WFOGO,
            TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID
        ));
    }

    // Build Swap instruction (USDC → FOGO, aToB = false)
    // For reverse swap, we use exact output mode:
    // - amount = output FOGO we want (estimate based on ~20 FOGO per USDC)
    // - other_amount_threshold = maximum USDC to spend
    // Price ~0.05 USDC/FOGO, so 1 USDC ≈ 20 FOGO
    const estimatedFogoOutput = Math.floor((amountUsdc / 1e6) * 20 * 1e9 * 0.95); // 95% for slippage

    const discriminator = Buffer.from('f8c69e91e17587c8', 'hex');
    const swapData = Buffer.alloc(42);
    swapData.set(discriminator, 0);
    swapData.writeBigUInt64LE(BigInt(estimatedFogoOutput), 8);   // amount = desired FOGO output
    swapData.writeBigUInt64LE(BigInt(amountUsdc), 16);           // threshold = max USDC to spend
    swapData.fill(0, 24, 40);                                    // sqrt_price_limit
    swapData.writeUInt8(0, 40);                                  // aToB = false (USDC → FOGO)
    swapData.writeUInt8(0, 41);                                  // amount_specified_is_input = false (exact output)

    // Account order SAME as aToB=true (wFogo first, then USDC)
    // The program internally handles the direction based on aToB flag
    const swapKeys = [
        { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
        { pubkey: wallet.publicKey, isSigner: true, isWritable: true },
        { pubkey: VORTEX_POSITION, isSigner: false, isWritable: true },
        { pubkey: wFogoAta, isSigner: false, isWritable: true },       // token_owner_account_a (WFOGO)
        { pubkey: VAULT_WFOGO, isSigner: false, isWritable: true },    // vault_a
        { pubkey: usdcAta, isSigner: false, isWritable: true },        // token_owner_account_b (USDC)
        { pubkey: VAULT_USDC, isSigner: false, isWritable: true },     // vault_b
        { pubkey: POOL_ADDRESS, isSigner: false, isWritable: true },
        { pubkey: TICK_ARRAY_0, isSigner: false, isWritable: true },
        { pubkey: TICK_ARRAY_1, isSigner: false, isWritable: true },
        { pubkey: TICK_ARRAY_2, isSigner: false, isWritable: false },
        { pubkey: ORACLE, isSigner: false, isWritable: false },
    ];

    tx.add(new anchor.web3.TransactionInstruction({
        keys: swapKeys,
        programId: VORTEX_PROGRAM_ID,
        data: swapData,
    }));

    // Close WFOGO ATA (unwrap to native FOGO)
    tx.add(createCloseAccountInstruction(
        wFogoAta, wallet.publicKey, wallet.publicKey, [], TOKEN_PROGRAM_ID
    ));

    const signature = await sendAndConfirmTransaction(connection, tx, [wallet]);
    console.log(`   ✅ Success! Tx: ${signature}`);
    return signature;
}

/**
 * Unwrap any existing WFOGO to native FOGO
 */
async function unwrapWFogo(connection, wallet) {
    const wFogoAta = getAssociatedTokenAddressSync(MINT_WFOGO, wallet.publicKey, false, TOKEN_PROGRAM_ID);

    try {
        const account = await getAccount(connection, wFogoAta);
        if (account.amount > 0n) {
            console.log(`\n💱 Unwrapping ${Number(account.amount) / 1e9} WFOGO → FOGO...`);

            const tx = new Transaction();
            tx.add(ComputeBudgetProgram.setComputeUnitLimit({ units: 100000 }));
            tx.add(ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 1 }));
            tx.add(createCloseAccountInstruction(
                wFogoAta, wallet.publicKey, wallet.publicKey, [], TOKEN_PROGRAM_ID
            ));

            const signature = await sendAndConfirmTransaction(connection, tx, [wallet]);
            console.log(`   ✅ Unwrapped! Tx: ${signature}`);
            return true;
        }
    } catch {
        // ATA doesn't exist or empty, nothing to unwrap
    }
    return false;
}

// ============================================================================
// MAIN LOOP
// ============================================================================

async function main() {
    console.log('\n' + '='.repeat(60));
    console.log('🔥 FOGO AutoSwap Bot');
    console.log('   Flow: FOGO → USDC → FOGO (repeat)');
    console.log('='.repeat(60));

    // Load wallet from private key
    const wallet = loadWalletFromPrivateKey(PRIVATE_KEY);
    console.log(`\n👛 Wallet: ${wallet.publicKey.toBase58()}`);

    // Connect
    const connection = new Connection(RPC_URL, 'confirmed');
    console.log(`🌐 RPC: ${RPC_URL}`);

    // Config info
    console.log(`\n⚙️  Config:`);
    console.log(`   Swap: ${SWAP_PERCENT}% of FOGO balance`);
    console.log(`   Delay: ${DELAY_MIN_MINUTES}-${DELAY_MAX_MINUTES} minutes`);

    let cycle = 0;

    while (true) {
        try {
            cycle++;
            console.log(`\n${'='.repeat(60)}`);
            console.log(`📊 Cycle #${cycle} - ${new Date().toLocaleString()}`);
            console.log('='.repeat(60));

            // Unwrap any stuck WFOGO first
            await unwrapWFogo(connection, wallet);

            // Print current balances
            const { fogoBalance, usdcBalance } = await printBalances(connection, wallet.publicKey);

            // Calculate 80% of balance (keep 20% for gas and reserve)
            const reserveForGas = 0.1 * 1e9; // 0.1 FOGO for gas
            const availableBalance = fogoBalance - reserveForGas;
            const swapAmountLamports = Math.floor(availableBalance * (SWAP_PERCENT / 100));

            // Minimum USDC to swap (0.01 USDC = 10000 micro-USDC) - skip dust
            const MIN_USDC_SWAP = 10000n; // 0.01 USDC

            // Check if we have enough USDC to swap first (recovery mode)
            if (usdcBalance >= MIN_USDC_SWAP && fogoBalance > 0.05 * 1e9) {
                console.log('\n💡 Found USDC balance, swapping to FOGO first...');
                await swapUsdcToFogo(connection, wallet, Number(usdcBalance));
                await printBalances(connection, wallet.publicKey);
            } else if (usdcBalance > 0n && usdcBalance < MIN_USDC_SWAP) {
                console.log(`\n💨 USDC dust detected (${Number(usdcBalance) / 1e6} USDC), skipping...`);
            }
            // Normal flow: FOGO → USDC → FOGO
            else if (availableBalance >= 0.1 * 1e9) {
                // Step 1: Swap FOGO → USDC
                await swapFogoToUsdc(connection, wallet, swapAmountLamports);

                // Small delay between swaps
                console.log('\n⏳ Waiting 5 seconds before reverse swap...');
                await new Promise(r => setTimeout(r, 5000));

                // Get new USDC balance
                const newUsdcBalance = await getTokenBalance(connection, wallet.publicKey, MINT_USDC);

                if (newUsdcBalance > 0n) {
                    // Step 2: Swap USDC → FOGO (semua USDC)
                    await swapUsdcToFogo(connection, wallet, Number(newUsdcBalance));
                }

                // Print final balances
                await printBalances(connection, wallet.publicKey);
            } else {
                console.log(`\n⚠️  Not enough FOGO! Need at least 0.2 FOGO (0.1 for swap + 0.1 for gas)`);
                console.log('   Waiting for next cycle...');
            }

            // Random delay 5-10 minutes
            const delayMs = randomDelay(DELAY_MIN_MINUTES, DELAY_MAX_MINUTES);
            const delayMins = (delayMs / 60000).toFixed(1);
            console.log(`\n⏳ Next cycle in ${delayMins} minutes...`);
            await new Promise(r => setTimeout(r, delayMs));

        } catch (error) {
            console.error(`\n❌ Error: ${error.message}`);
            console.log('🔄 Retrying in 60 seconds...');
            await new Promise(r => setTimeout(r, 60000));
        }
    }
}

main().catch(console.error);

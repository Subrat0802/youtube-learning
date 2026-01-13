import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { VoteApp } from "../target/types/vote_app";
import NodeWallet from "@coral-xyz/anchor/dist/cjs/nodewallet";
import { expect } from "chai";
import { getAccount, getOrCreateAssociatedTokenAccount } from "@solana/spl-token";

const SEEDS = {
  TREASURY_CONFIG: "treasury_config",
  SOL_VAULT: "sol_vault",
  X_MINT: "x_mint",
  MINT_AUTHORITY: "mint_authority",
  VOTER: "voter"
}

const findPda = (programId: anchor.web3.PublicKey, seeds: (Buffer | Uint8Array)[]):anchor.web3.PublicKey => {
  const [pda, bump] = anchor.web3.PublicKey.findProgramAddressSync(seeds, programId);
  return pda;
}

const airDropSol = async (connection: anchor.web3.Connection, publicKey: anchor.web3.PublicKey, sol: number) => {
  const signature = await connection.requestAirdrop(publicKey, sol);
  await connection.confirmTransaction(signature, "confirmed");
}
 
describe("vote_app", () => {
  const provider = anchor.AnchorProvider.env();
  const connection = provider.connection;
  anchor.setProvider(provider);
  const program = anchor.workspace.voteApp as Program<VoteApp>;



  const adminWallet = (provider.wallet as NodeWallet).payer;
  let treasuryTokenAccount:anchor.web3.PublicKey;



  let proposalCreatorWallet = new anchor.web3.Keypair();
  let proposalCreatorTokenAccount: anchor.web3.PublicKey;



  let voterWallet = new anchor.web3.Keypair();
  let voterTokenAccount: anchor.web3.PublicKey;
  let voterPda: anchor.web3.PublicKey;



  let treasuryConfigPda: anchor.web3.PublicKey;
  let xMintPda: anchor.web3.PublicKey;
  let solVaultPda: anchor.web3.PublicKey;
  let mintAuthorityPda: anchor.web3.PublicKey;

  beforeEach(async () => {
    treasuryConfigPda = findPda(program.programId, [anchor.utils.bytes.utf8.encode(SEEDS.TREASURY_CONFIG)])
    solVaultPda = findPda(program.programId, [anchor.utils.bytes.utf8.encode(SEEDS.SOL_VAULT)])
    xMintPda = findPda(program.programId, [anchor.utils.bytes.utf8.encode(SEEDS.X_MINT)])
    mintAuthorityPda = findPda(program.programId, [anchor.utils.bytes.utf8.encode(SEEDS.MINT_AUTHORITY)])
    voterPda = findPda(program.programId, [anchor.utils.bytes.utf8.encode(SEEDS.VOTER), voterWallet.publicKey.toBuffer()])
    await airDropSol(connection, proposalCreatorWallet.publicKey, 10 * anchor.web3.LAMPORTS_PER_SOL);
    await airDropSol(connection, voterWallet.publicKey, 10 * anchor.web3.LAMPORTS_PER_SOL)
  })


  const createTokenAccount = async () => {
    treasuryTokenAccount = (await getOrCreateAssociatedTokenAccount(
      connection,
      adminWallet,
      xMintPda,
      adminWallet.publicKey
    )).address

    proposalCreatorTokenAccount = (await getOrCreateAssociatedTokenAccount(
      connection,
      proposalCreatorWallet,
      xMintPda,
      proposalCreatorWallet.publicKey
    )).address

    voterTokenAccount = (await getOrCreateAssociatedTokenAccount(
      connection,
      voterWallet,
      xMintPda,
      voterWallet.publicKey
    )).address
  }

  describe("1.Initialize treasury account", () => {
    it("initialize treasury",async () => {
      const solPrice = new anchor.BN(1000000000)
      const tokenPerPurchase = new anchor.BN(1000000000)
      console.log("Treasury config pda", treasuryConfigPda.toBase58());

      const tx = await program.methods.initializTreasury(solPrice, tokenPerPurchase).accountsPartial({
        authority: adminWallet.publicKey,
        treasuryConfigAccount: treasuryConfigPda,
        xMint: xMintPda,
      }).rpc();
      console.log(tx);
      const treasuryAccountData = await program.account.treasuryConfig.fetch(treasuryConfigPda); 
      console.log("reasuryAccountData", treasuryAccountData)
      expect(treasuryAccountData.authority.toBase58()).to.equal(adminWallet.publicKey.toBase58());
      expect(treasuryAccountData.tokenPerPurchase.toNumber()).to.equal(tokenPerPurchase.toNumber());
      expect(treasuryAccountData.solPrice.toNumber()).to.equal(solPrice.toNumber());
      expect(treasuryAccountData.xMint.toBase58()).to.equal(xMintPda.toBase58());
      await createTokenAccount();
    })
  })

  describe("2. buy tokens for proposal and voter wallet", () => {
    it("1. buy token for proposal", async () => {
      const tokenBalanceBefore = (await getAccount(connection, proposalCreatorTokenAccount)).amount;

      await program.methods.buyTokens().accounts({
        buyer: proposalCreatorWallet.publicKey,
        xMint: xMintPda,
        treasuryTokenAccount: treasuryTokenAccount,
        buyerTokenAccount: proposalCreatorTokenAccount
      }).signers([proposalCreatorWallet]).rpc();

      const tokenBalanceAfter = (await getAccount(connection, proposalCreatorTokenAccount)).amount;
      console.log(tokenBalanceAfter)
      console.log(tokenBalanceBefore);
      expect(tokenBalanceAfter - tokenBalanceBefore).to.equal(BigInt(1000000000));
    })

    it("2. buy token for voter wallet", async () => {
      const tokenBalanceBefore = (await getAccount(connection, voterTokenAccount)).amount;

      await program.methods.buyTokens().accounts({
        buyer: voterWallet.publicKey,
        xMint: xMintPda,
        treasuryTokenAccount: treasuryTokenAccount,
        buyerTokenAccount: voterTokenAccount
      }).signers([voterWallet]).rpc();

      const tokenBalanceAfter = (await getAccount(connection, voterTokenAccount)).amount;
      console.log(tokenBalanceAfter)
      console.log(tokenBalanceBefore);
      expect(tokenBalanceAfter - tokenBalanceBefore).to.equal(BigInt(1000000000));
    })
  })

  describe("3. register voters", () => {
    it("Register voter", async () => {
      await program.methods.registerVoter().accountsPartial({
        authority: voterWallet.publicKey,           
      }).signers([voterWallet]).rpc();

      const voterAccountData = await program.account.voter.fetch(voterPda);
        expect(voterAccountData.voterId.toBase58()).to.equal(voterWallet.publicKey.toBase58());
        console.log("voterAccount", voterAccountData.voterId.toBase58());
        console.log("voterAccount", voterWallet.publicKey.toBase58());
        console.log("voter pda", voterPda.toBase58());
        console.log("voterAccount", voterAccountData.proposalVoted);
    })
  })

});

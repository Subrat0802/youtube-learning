import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { VoteApp } from "../target/types/vote_app";
import NodeWallet from "@coral-xyz/anchor/dist/cjs/nodewallet";
import { expect } from "chai";
import { getOrCreateAssociatedTokenAccount } from "@solana/spl-token";
import { publicKey } from "@coral-xyz/anchor/dist/cjs/utils";


const SEEDS = {
  TREASURY_CONFIG: "treasury_config",
  X_MINT: "x_mint",
  MINT_AUTHORITY: "mint_authority",
  SOL_VAULT: "sol_vault"
} as const;

const findPda = (programId: anchor.web3.PublicKey, seeds: (Buffer | Uint8Array)[]):anchor.web3.PublicKey => {
  const [pda, bump] = anchor.web3.PublicKey.findProgramAddressSync(seeds, programId);
  return pda;
}


const airDropSol = async (connection: anchor.web3.Connection, publicKey: anchor.web3.PublicKey, sol: number) => {
  console.log("transfering sol token");
  const signature = await connection.requestAirdrop(publicKey, sol);
  await connection.confirmTransaction(signature, "confirmed");
  const balance = await connection.getBalance(publicKey);
  console.log("transfer sol successfull")
  console.log("BALANCE:", balance);
}

describe("vote_app", () => {
  const provider = anchor.AnchorProvider.env();
  const connection = provider.connection;
  anchor.setProvider(provider);
  const program = anchor.workspace.voteApp as Program<VoteApp>;

  const adminWallet = (provider.wallet as NodeWallet).payer;
  let proposalCreatorWallet = new anchor.web3.Keypair();
  let proposalCreatorTokenAccount: anchor.web3.PublicKey;

  let treasuryConfigPda:anchor.web3.PublicKey;
  let xMintPda:anchor.web3.PublicKey;
  let solVaultPda:anchor.web3.PublicKey;
  let mintAuthorityPda:anchor.web3.PublicKey;
  let treasuryTokenAccount:anchor.web3.PublicKey;


  beforeEach(async () => {
    treasuryConfigPda = findPda(program.programId, [anchor.utils.bytes.utf8.encode(SEEDS.TREASURY_CONFIG)]);
    solVaultPda = findPda(program.programId, [anchor.utils.bytes.utf8.encode(SEEDS.SOL_VAULT)]);
    mintAuthorityPda = findPda(program.programId, [anchor.utils.bytes.utf8.encode(SEEDS.MINT_AUTHORITY)]);
    xMintPda = findPda(program.programId, [anchor.utils.bytes.utf8.encode(SEEDS.X_MINT)]);
    await airDropSol(connection, proposalCreatorWallet.publicKey, 10 * anchor.web3.LAMPORTS_PER_SOL);
  })

  const createTokenAccounts = async () => {
    console.log("Init of token account");
      treasuryTokenAccount =( await getOrCreateAssociatedTokenAccount(
        connection,
        adminWallet,
        xMintPda,
        adminWallet.publicKey
      )).address ;


      proposalCreatorTokenAccount = (await getOrCreateAssociatedTokenAccount(
        connection,
        proposalCreatorWallet,
        xMintPda,
        proposalCreatorWallet.publicKey
      )).address
    }

    describe("1. initiaze traesury", () => {
       it("initialise traesaury", async () => {
        const solPrice = new anchor.BN(1000000000);
        const tokenPerPurchase = new anchor.BN(1000000000)

        console.log("Treasury config PDA", treasuryConfigPda);

        const tx = await program.methods.initializeTreasury(solPrice, tokenPerPurchase).accounts({
          authority: adminWallet.publicKey,
        }).rpc();

        const treasuryAccountData = await program.account.treasuryConfig.fetch(treasuryConfigPda);
        expect(treasuryAccountData.authority.toBase58()).to.equal(adminWallet.publicKey.toBase58());
        expect(treasuryAccountData.tokenPerPurchase.toNumber()).to.equal(tokenPerPurchase.toNumber());
        expect(treasuryAccountData.solPrice.toNumber()).to.equal(solPrice.toNumber());
        expect(treasuryAccountData.xMint.toBase58()).to.equal(xMintPda.toBase58());
        await createTokenAccounts();
      });
    })

 

    describe("2. buy tokens", () => {
        it("buy tokens!", async () => {
        await program.methods.buyTokens().accounts({
          buyer: proposalCreatorWallet.publicKey,
          // mintAuthority: mintAuthorityPda,
          xMint: xMintPda,
          treasuryTokenAccount: treasuryTokenAccount,
          // solvault: solVaultPda,
          // treasuryConfigAccount: treasuryConfigPda,
          buyerTokenAccount:proposalCreatorTokenAccount
        }).signers([proposalCreatorWallet]).rpc();
      }) 
    })

});



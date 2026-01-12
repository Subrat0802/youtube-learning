import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { VoteApp } from "../target/types/vote_app";
import NodeWallet from "@coral-xyz/anchor/dist/cjs/nodewallet";
import { expect } from "chai";

const SEEDS = {
  TREASURY_CONFIG: "treasury_config",
  SOL_VAULT: "sol_vault",
  X_MINT: "x_mint",
  MINT_AUTHORITY: "mint_authority"
}

const findPda = (programId: anchor.web3.PublicKey, seeds: (Buffer | Uint8Array)[]):anchor.web3.PublicKey => {
  const [pda, bump] = anchor.web3.PublicKey.findProgramAddressSync(seeds, programId);
  return pda;
}

describe("vote_app", () => {
  const provider = anchor.AnchorProvider.env();
  const connection = provider.connection;
  anchor.setProvider(provider);
  const program = anchor.workspace.voteApp as Program<VoteApp>;
  const adminWallet = (provider.wallet as NodeWallet).payer;


  let treasuryConfigPda: anchor.web3.PublicKey;
  let xMintPda: anchor.web3.PublicKey;
  let solVaultPda: anchor.web3.PublicKey;
  let mintAuthorityPda: anchor.web3.PublicKey;

  beforeEach(async () => {
    treasuryConfigPda = findPda(program.programId, [anchor.utils.bytes.utf8.encode(SEEDS.TREASURY_CONFIG)])
    solVaultPda = findPda(program.programId, [anchor.utils.bytes.utf8.encode(SEEDS.SOL_VAULT)])
    xMintPda = findPda(program.programId, [anchor.utils.bytes.utf8.encode(SEEDS.X_MINT)])
    mintAuthorityPda = findPda(program.programId, [anchor.utils.bytes.utf8.encode(SEEDS.MINT_AUTHORITY)])
  })

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
    })
  })

});

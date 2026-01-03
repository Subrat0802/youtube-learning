import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Voting } from "../target/types/voting";
import NodeWallet from "@coral-xyz/anchor/dist/cjs/nodewallet";

describe("voting", () => {
  const provider = anchor.AnchorProvider.env();
  const connection = provider.connection;
  anchor.setProvider(provider);
  const program = anchor.workspace.voting as Program<Voting>
  const adminWallet = (provider.wallet as NodeWallet).payer;

  it("Is initialized!", async () => {
    const solPrice = new anchor.BN(1000000000);
    const tokenPerPurchase = new anchor.BN(100000000);
    const tx = await program.methods.initialize(solPrice, tokenPerPurchase).accounts({
          authority: adminWallet.publicKey,
        }).rpc();
    console.log("Your transaction signature", tx);
  })
});

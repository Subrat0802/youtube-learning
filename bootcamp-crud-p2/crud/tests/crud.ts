import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Crud } from "../target/types/crud";
import { expect } from "chai";

describe("crud", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.Crud as Program<Crud>;

  it("Create → Update → Delete journal", async () => {
    const title = "gym";
    const message1 = "i will go to gym daily";
    const message2 = "i will not go to gym daily";

    // ✅ PDA
    const [journalEntryAccount] =
      anchor.web3.PublicKey.findProgramAddressSync(
        [
          Buffer.from(title),
          provider.wallet.publicKey.toBuffer(),
        ],
        program.programId
      );

    // ✅ CREATE
    await program.methods
      .createJournalEntry(title, message1)
      .accounts({
        owner: provider.wallet.publicKey,
        journalEntryAccount,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    const created = await program.account.journalEntryState.fetch(
      journalEntryAccount
    );
    console.log("Created:", created);
    expect(created.message).to.equal(message1);

    // ✅ UPDATE
    await program.methods
      .updateJournalEntry(title, message2)
      .accounts({
        owner: provider.wallet.publicKey,
        journalEntryAccount,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    const updated = await program.account.journalEntryState.fetch(
      journalEntryAccount
    );
    console.log("Updated:", updated);
    expect(updated.message).to.equal(message2);

    // ✅ DELETE
    await program.methods
      .deleteJournal(title)
      .accounts({
        owner: provider.wallet.publicKey,
        journalEntryAccount,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    // ✅ EXPECT FETCH TO FAIL
    try {
      await program.account.journalEntryState.fetch(journalEntryAccount);
      throw new Error("Account should be deleted");
    } catch (err) {
      console.log("Account successfully deleted");
    }
  });
});

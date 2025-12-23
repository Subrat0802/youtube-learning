import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Voting } from "../target/types/voting";

describe("voting", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.voting as Program<Voting>;

  const pollId = new anchor.BN(1);
  const pollStart = new anchor.BN(Math.floor(Date.now() / 1000));
  const pollEnd = new anchor.BN(pollStart.toNumber() + 3600);

  const candidateName = "butter";

  // Poll PDA
  const [pollPda] = anchor.web3.PublicKey.findProgramAddressSync(
    [pollId.toArrayLike(Buffer, "le", 8)],
    program.programId
  );

  // Candidate PDA
  const [candidatePda] = anchor.web3.PublicKey.findProgramAddressSync(
    [
      pollId.toArrayLike(Buffer, "le", 8),
      Buffer.from(candidateName),
    ],
    program.programId
  );


  it("Initializes poll", async () => {
    const tx = await program.methods
      .initialize(
        pollId,
        "which one is better?",
        pollStart,
        pollEnd
      )
      .accounts({
        signer: provider.wallet.publicKey,
        poll: pollPda,
      })
      .rpc();

    console.log("Initialize tx:", tx);

    const poll = await program.account.pollDetails.fetch(pollPda);

    console.log({
      pollId: poll.pollId.toNumber(),
      description: poll.description,
      pollStart: poll.pollStart.toNumber(),
      pollEnd: poll.pollEnd.toNumber(),
      candidateAmount: poll.candidateAmount.toNumber(),
    });
  });


  it("Adds candidate", async () => {
    const tx = await program.methods
      .candidate(pollId, candidateName)
      .accounts({
        signer: provider.wallet.publicKey,
        poll: pollPda,
        candidate: candidatePda,
      })
      .rpc();

    console.log("Candidate tx:", tx);

    const poll = await program.account.pollDetails.fetch(pollPda);
    const candidate = await program.account.candidateDetails.fetch(candidatePda);

    console.log("Poll after candidate:", {
      candidateAmount: poll.candidateAmount.toNumber(),
    });

    console.log("Candidate:", {
      name: candidate.candidateName,
      votes: candidate.candidateVotes.toNumber(),
    });
  });

  it("Votes for candidate", async () => {
    const tx = await program.methods
      .vote(pollId, candidateName)
      .accounts({
        signer: provider.wallet.publicKey,
        poll: pollPda,
        candidate: candidatePda,
      })
      .rpc();

    console.log("Vote tx:", tx);

    const candidate = await program.account.candidateDetails.fetch(candidatePda);

    console.log("Candidate after vote:", {
      name: candidate.candidateName,
      votes: candidate.candidateVotes.toNumber(),
    });
  });
});

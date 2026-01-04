import React from "react";
import { SEEDS } from "../constants/constants";
import { PublicKey } from "@solana/web3.js";
import * as anchor from "@coral-xyz/anchor";
import { useState } from "react";
import { getAssociatedTokenAddress } from "@solana/spl-token";
import Buffer from "buffer";

const RegisterProposal = ({ walletAddress, idlWithAddress, getProvider }) => {
  const [proposalDescription, setProposalDescription] = useState("");
  const [deadline, setDeadline] = useState("");
  const [stakeAmount, setStakeAmount] = useState("");

  // Convert tokens to raw amount (6 decimals)
  const tokensToRaw = (tokens) => {
    return Math.floor(Number(tokens) * 1_000_000);
  };

  const registerProposal = async () => {
    if (!walletAddress) {
      alert("Please connect your wallet");
      return;
    }

    const provider = getProvider();
    const program = new anchor.Program(idlWithAddress, provider);

    const [treasuryConfigPda] = PublicKey.findProgramAddressSync(
      [new TextEncoder().encode(SEEDS.TREASURY_CONFIG)],
      program.programId
    );

    const [xMintPda] = PublicKey.findProgramAddressSync(
      [new TextEncoder().encode(SEEDS.X_MINT)],
      program.programId
    );

    const [proposalCounterPda] = PublicKey.findProgramAddressSync(
      [new TextEncoder().encode(SEEDS.PROPOSAL_COUNTER)],
      program.programId
    );

    const treasuryConfig = await program.account.treasuryConfig.fetch(treasuryConfigPda);

    const propsalTokenAccount = await getAssociatedTokenAddress(
        xMintPda,
        provider.wallet.publicKey
    );

    const proposalCounterAccount = await program.account.proposalCounter.fetch(proposalCounterPda);

    let [proposalAccountPda] = PublicKey.findProgramAddressSync(
        [new TextEncoder().encode(SEEDS.PROPOSAL), new Uint8Array([proposalCounterAccount.proposalCount])],
        program.programId
    )

    const deadlineTimeStamp = new anchor.BN(Math.floor(new Date(deadline).getTime()));
    const stakeRaw = tokensToRaw(stakeAmount);


    const tx = await program.methods.registerProposal(
        proposalDescription,
        deadlineTimeStamp,
        new anchor.BN(stakeRaw)
    ).accountsPartial({
        proposalCounterAccount: proposalCounterPda,
        signer: provider.wallet.publicKey,
        proposalAccount: proposalAccountPda,
        xMint: xMintPda,
        proposalTokenAccount: propsalTokenAccount,
        treasuryTokenAccount: treasuryConfig.treasuryTokenAccount
    }).rpc();
    console.log("Transaction successful", tx);
  };
  return (
    <div className="card">
      <h2>📝 Register Proposal</h2>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          registerProposal();
        }}
      >
        <input
          type="text"
          placeholder="Proposal Description"
          value={proposalDescription}
          onChange={(e) => setProposalDescription(e.target.value)}
        />
        <input
          type="datetime-local"
          placeholder="Deadline"
          value={deadline}
          onChange={(e) => setDeadline(e.target.value)}
        />
        <input
          type="number"
          step="0.01"
          placeholder="Token Stake Amount"
          value={stakeAmount}
          onChange={(e) => setStakeAmount(e.target.value)}
        />
        <button type="submit">Register Proposal</button>
      </form>
    </div>
  );
};

export default RegisterProposal;

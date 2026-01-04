import { useState } from "react";
import * as anchor from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";
import { getAssociatedTokenAddress } from "@solana/spl-token";
import { Buffer } from "buffer";
import { SEEDS } from "../constants/constants";

const InitializeTreasury = ({ walletAddress, idlWithAddress, getProvider }) => {
  const [solPrice, setSolPrice] = useState("");
  const [tokensPerPurchase, setTokensPerPurchase] = useState("");

  const solToLamports = (sol) =>
    Math.floor(Number(sol) * 1_000_000_000);

  const tokensToRaw = (tokens) =>
    Math.floor(Number(tokens) * 1_000_000);

  const initializeTreasury = async () => {
    if (!walletAddress) {
      alert("Please connect wallet");
      return;
    }

    const provider = getProvider();

    const program = new anchor.Program(
      idlWithAddress,
      provider
    );

    const [treasuryConfigPda] = PublicKey.findProgramAddressSync(
      [Buffer.from(SEEDS.TREASURY_CONFIG)],
      program.programId
    );

    const [mintAuthorityPda] = PublicKey.findProgramAddressSync(
      [Buffer.from(SEEDS.MINT_AUTHORITY)],
      program.programId
    );

    const [solVaultPda] = PublicKey.findProgramAddressSync(
      [Buffer.from(SEEDS.SOL_VAULT)],
      program.programId
    );

    const [xMintPda] = PublicKey.findProgramAddressSync(
      [Buffer.from(SEEDS.X_MINT)],
      program.programId
    );

    const [proposalCounterPda] = PublicKey.findProgramAddressSync(
      [Buffer.from(SEEDS.PROPOSAL_COUNTER)],
      program.programId
    );

    const treasuryTokenAccount = await getAssociatedTokenAddress(
      xMintPda,
      provider.wallet.publicKey
    );

    const tx = await program.methods
      .initializeTreasury(
        new anchor.BN(solToLamports(solPrice)),
        new anchor.BN(tokensToRaw(tokensPerPurchase))
      )
      .accountsPartial({
        authority: provider.wallet.publicKey,
        treasuryConfig: treasuryConfigPda,
        mintAuthority: mintAuthorityPda,
        solVault: solVaultPda,
        xMint: xMintPda,
        treasuryTokenAccount,
        proposalCounter: proposalCounterPda,
      })
      .rpc();

    console.log("✅ TX:", tx);
  };

  return (
    <div className="card">
      <h2>🏦 Initialize Treasury</h2>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          initializeTreasury();
        }}
      >
        <input
          type="number"
          step="0.001"
          placeholder="SOL Price"
          value={solPrice}
          onChange={(e) => setSolPrice(e.target.value)}
        />
        <input
          type="number"
          step="0.01"
          placeholder="Tokens Per Purchase"
          value={tokensPerPurchase}
          onChange={(e) => setTokensPerPurchase(e.target.value)}
        />
        <button type="submit">Initialize Treasury</button>
      </form>
    </div>
  );
};

export default InitializeTreasury;

import {
  createNft,
  fetchDigitalAsset,
  mplTokenMetadata,
} from "@metaplex-foundation/mpl-token-metadata";

import {
  airdropIfRequired,
  getExplorerLink,
  getKeypairFromFile,
} from "@solana-developers/helpers";

import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";

import {
  generateSigner,
  keypairIdentity,
  percentAmount,
  publicKey,
} from "@metaplex-foundation/umi";

import {
  clusterApiUrl,
  Connection,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";

async function main() {
  /* ---------------- CONNECTION ---------------- */
  const connection = new Connection(clusterApiUrl("devnet"), "confirmed");

  /* ---------------- WALLET ---------------- */
  const user = await getKeypairFromFile();

  await airdropIfRequired(
    connection,
    user.publicKey,
    1 * LAMPORTS_PER_SOL,
    0.5 * LAMPORTS_PER_SOL
  );

  console.log("Loaded user", user.publicKey.toBase58());

  /* ---------------- UMI ---------------- */
  const umi = createUmi(connection.rpcEndpoint);
  umi.use(mplTokenMetadata());

  const umiUser = umi.eddsa.createKeypairFromSecretKey(user.secretKey);
  umi.use(keypairIdentity(umiUser));

  console.log("Set up Umi instance for user");

  /* ---------------- COLLECTION ---------------- */
  const collectionAddress = publicKey(
    "9KiWsbxFmNoGHxyk3Uo3TK31JVCMtTNhaqiQDt7gypDX"
  );

  console.log("Creating NFT...");

  /* ---------------- NFT MINT ---------------- */
  const mint = generateSigner(umi);

  const builder = await createNft(umi, {
    mint,
    name: "My NFT",
    uri: "https://raw.githubusercontent.com/Subrat0802/solana-token-metadata/main/sample-nft-offchain-data.json",
    sellerFeeBasisPoints: percentAmount(0),
    collection: {
      key: collectionAddress,
      verified: false, // will verify later
    },
  });

  // 🔹 Send transaction (do NOT fetch yet)
  const result = await builder.sendAndConfirm(umi);

  console.log(
    "Transaction:",
    getExplorerLink("tx", result.signature, "devnet")
  );

  /* ---------------- WAIT FOR MINT ---------------- */
  console.log("Waiting for NFT mint to be indexed...");

  for (let i = 0; i < 15; i++) {
    try {
      const nft = await fetchDigitalAsset(
        umi,
        mint.publicKey
      );

      console.log(
        "🖼️ NFT Created:",
        getExplorerLink(
          "address",
          nft.mint.publicKey,
          "devnet"
        )
      );
      return;
    } catch {
      await new Promise((r) => setTimeout(r, 1000));
    }
  }

  throw new Error("Mint account not found after waiting");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

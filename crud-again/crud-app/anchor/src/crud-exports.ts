// Here we export some useful types and functions for interacting with the Anchor program.
import { AnchorProvider, Program } from '@coral-xyz/anchor'
import { Cluster, PublicKey } from '@solana/web3.js'
import CrudIDL from '../target/idl/crud.json'
import type { Crud } from '../target/types/crud'

// Re-export the generated IDL and type
export { Crud, CrudIDL }

// The programId is imported from the program IDL.
export const CRUD_PROGRAM_ID = new PublicKey(CrudIDL.address)

// This is a helper function to get the Crud Anchor program.
export function getCrudProgram(provider: AnchorProvider, address?: PublicKey): Program<Crud> {
  // Always use the IDL's declared address to avoid DeclaredProgramIdMismatch errors
  // Anchor validates the IDL's address field against the deployed program
  // If you need a different address, it should be set in the IDL itself via declare_id!
  return new Program(CrudIDL as Crud, provider)
}

// This is a helper function to get the program ID for the Crud program depending on the cluster.
export function getCrudProgramId(cluster: Cluster | 'localnet') {
  // For localnet/devnet/testnet, use the program ID from Anchor.toml
  // This should match the program ID declared in the Rust code (declare_id!)
  const programId = '9ACUuVC25tVMqy7wn6h67uB7euMhqKKFnkZHew9rDCwg'
  
  switch (cluster) {
    case 'devnet':
    case 'testnet':
    case 'localnet':
      return new PublicKey(programId)
    case 'mainnet-beta':
      return CRUD_PROGRAM_ID
    default:
      // Default to the program ID from IDL (which should match declare_id!)
      return CRUD_PROGRAM_ID
  }
}



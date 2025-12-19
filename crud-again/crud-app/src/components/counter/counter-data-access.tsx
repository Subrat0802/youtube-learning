'use client'

import { getCounterProgram, getCounterProgramId, getCrudProgram, getCrudProgramId } from '@project/anchor'
import { useConnection } from '@solana/wallet-adapter-react'
import { Cluster, PublicKey } from '@solana/web3.js'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo } from 'react'
import { useCluster } from '../cluster/cluster-data-access'
import { useAnchorProvider } from '../solana/solana-provider'
import { useTransactionToast } from '../use-transaction-toast'
import { toast } from 'sonner'
import { useWallet } from '@solana/wallet-adapter-react'

interface CreateEntryArgs {
  title: string;
  message: string;
  owner: PublicKey;
}

export function useCounterProgram() {
  const { connection } = useConnection()
  const { cluster } = useCluster()
  const transactionToast = useTransactionToast()
  const provider = useAnchorProvider()
  const wallet = useWallet()
  const queryClient = useQueryClient()
  
  // Determine cluster type - handle localhost as localnet
  const clusterType = useMemo(() => {
    if (!cluster.network && cluster.endpoint?.includes('localhost')) {
      return 'localnet' as Cluster | 'localnet'
    }
    return (cluster.network || 'localnet') as Cluster | 'localnet'
  }, [cluster])
  
  const programId = useMemo(() => getCounterProgramId(cluster.network as Cluster), [cluster])
  const program = useMemo(() => getCounterProgram(provider, programId), [provider, programId])
  
  const crudProgramId = useMemo(() => getCrudProgramId(clusterType), [clusterType])
  const crudProgram = useMemo(() => getCrudProgram(provider, crudProgramId), [provider, crudProgramId])

  const accounts = useQuery({
    queryKey: ['counter', 'all', { cluster }],
    queryFn: () => crudProgram.account.journalEntryState.all(),
    enabled: !!crudProgram,
  })

  const getProgramAccount = useQuery({
    queryKey: ['get-program-account', { cluster }],
    queryFn: () => connection.getParsedAccountInfo(programId),
  })

  const createEntry = useMutation<string, Error, CreateEntryArgs>({
    mutationKey: [`journalEntry`, `create`, { cluster }],
    mutationFn: async ({title, message, owner}) => {
      if (!wallet.publicKey) throw new Error('Wallet not connected')
      return crudProgram.methods.createJournalEntry(title, message)
        .accounts({
          owner: owner,
        })
        .rpc();
    },
    onSuccess: async (signature) => {
      transactionToast(signature);
      // Wait for transaction confirmation and account indexing
      await new Promise(resolve => setTimeout(resolve, 2000));
      // Invalidate and refetch the accounts query
      queryClient.invalidateQueries({ queryKey: ['counter', 'all'] });
      // Also refetch directly
      setTimeout(() => {
        accounts.refetch();
      }, 500);
    },
    onError: (error) => {
      toast.error(`Error creating entry: ${error.message}`)
    }
  });

  return {
    program,
    accounts,
    getProgramAccount,
    createEntry,
    programId
  }

}

export function useCounterProgramAccount({ account }: { account: PublicKey }) {
  const { cluster } = useCluster()
  const transactionToast = useTransactionToast()
  const { accounts } = useCounterProgram()
  const provider = useAnchorProvider()
  const wallet = useWallet()
  
  // Determine cluster type - handle localhost as localnet
  const clusterType = useMemo(() => {
    if (!cluster.network && cluster.endpoint?.includes('localhost')) {
      return 'localnet' as Cluster | 'localnet'
    }
    return (cluster.network || 'localnet') as Cluster | 'localnet'
  }, [cluster])
  
  const crudProgramId = useMemo(() => getCrudProgramId(clusterType), [clusterType])
  const crudProgram = useMemo(() => getCrudProgram(provider, crudProgramId), [provider, crudProgramId])

  const accountQuery = useQuery({
    queryKey: ['counter', 'fetch', { cluster, account }],
    queryFn: () => crudProgram.account.journalEntryState.fetch(account),
  })

  const updateEntry = useMutation<string, Error, CreateEntryArgs>({
    mutationKey: [`journalEntry`, `update`, { cluster }],
    mutationFn: async ({title, message, owner}) => {
      if (!wallet.publicKey) throw new Error('Wallet not connected')
      return crudProgram.methods.updateJournal(title, message)
        .accounts({
          owner: owner,
        })
        .rpc();
    },
    onSuccess: (signature) => {
      transactionToast(signature);
      accounts.refetch();
      accountQuery.refetch();
    },
    onError: (error) => {
      toast.error(`Error updating entry: ${error.message}`)
    }
  })

  const deleteEntry = useMutation<string, Error, { title: string; owner: PublicKey }>({
    mutationKey: [`journalEntry`, `delete`, { cluster }],
    mutationFn: async ({title, owner}) => {
      if (!wallet.publicKey) throw new Error('Wallet not connected')
      return crudProgram.methods.deleteJournal(title)
        .accounts({
          owner: owner,
        })
        .rpc();
    },
    onSuccess: (signature) => {
      transactionToast(signature);
      accounts.refetch();
      accountQuery.refetch();
    },
    onError: (error) => {
      toast.error(`Error deleting entry: ${error.message}`)
    }
  });

  return {
    accountQuery,
    updateEntry,
    deleteEntry
  };
}

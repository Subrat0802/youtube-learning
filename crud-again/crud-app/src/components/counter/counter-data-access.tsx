'use client'

import { getCounterProgram, getCounterProgramId, getCrudProgram, getCrudProgramId } from '@project/anchor'
import { useConnection } from '@solana/wallet-adapter-react'
import { Cluster, Keypair, PublicKey } from '@solana/web3.js'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { useCluster } from '../cluster/cluster-data-access'
import { useAnchorProvider } from '../solana/solana-provider'
import { useTransactionToast } from '../use-transaction-toast'
import { toast } from 'sonner'
import { title } from 'process'

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
  const programId = useMemo(() => getCounterProgramId(cluster.network as Cluster), [cluster])
  const program = useMemo(() => getCounterProgram(provider, programId), [provider, programId])
  
  const crudProgramId = useMemo(() => getCrudProgramId(cluster.network as Cluster), [cluster])
  const crudProgram = useMemo(() => getCrudProgram(provider, crudProgramId), [provider, crudProgramId])

  const accounts = useQuery({
    queryKey: ['counter', 'all', { cluster }],
    queryFn: () => crudProgram.account.journalEntryState.all(),
  })

  const getProgramAccount = useQuery({
    queryKey: ['get-program-account', { cluster }],
    queryFn: () => connection.getParsedAccountInfo(programId),
  })

  const createEntry = useMutation<string, Error, CreateEntryArgs>({
    mutationKey: [`journalEntry`, `create`, { cluster }],
    mutationFn: async ({title, message, owner}) => {
      return program.methods.createJournalEntry(title, message, {account: {owner}}).rpc();
    },
    onSuccess: (signature) => {
      transactionToast(signature);
      accounts.refetch();
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
  const crudProgramId = useMemo(() => getCrudProgramId(cluster.network as Cluster), [cluster])
  const crudProgram = useMemo(() => getCrudProgram(provider, crudProgramId), [provider, crudProgramId])

  const accountQuery = useQuery({
    queryKey: ['counter', 'fetch', { cluster, account }],
    queryFn: () => crudProgram.account.journalEntryState.fetch(account),
  })

  const updateEntry = useMutation<string, Error, CreateEntryArgs>({
    mutationKey: [`journalEntry`, `update`, { cluster }],
    mutationFn: async ({title, message}) => {
      return program.methods.updateJournalEntry(title, message).rpc();
    },
    onSuccess: (signature) => {
      transactionToast(signature);
      accounts.refetch();
    },
    onError: (error) => {
      toast.error(`Error updating entry: ${error.message}`)
    }
  })

  const deleteEntry = useMutation({
    mutationKey: [`journalEntry`, `delete`, { cluster }],
    mutationFn: (title: string) => {
      return program.methods.deleteJournalEntry(title).rpc();
    },
    onSuccess: (signature) => {
      transactionToast(signature);
      accounts.refetch();
    },
  });

  return {
    accountQuery,
    updateEntry,
    deleteEntry
  };
}

'use client'

import { useCounterProgram, useCounterProgramAccount } from './counter-data-access'
import { useState } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import { PublicKey } from '@solana/web3.js';

export function CounterCreate() {
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const {createEntry} = useCounterProgram();
  const {publicKey} = useWallet();  


  const isFromValid = title.trim() != '' && message.trim() != '';

  const handleSubmit = () => {
    if (!publicKey && isFromValid){
      createEntry.mutateAsync({title, message, owner: publicKey});
     }
  }

  if (!publicKey){
    return <p>Connects your wallet.</p>
  }

  return (
    <div>
      <input 
        type='text'
        placeholder='title'
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className='input input-border w-full, max-w-xs'
      />
      <textarea 
        placeholder='message'
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        className='textarea textarea-bordered w-full, max-w-xs'
      />
      <button
        onClick={handleSubmit}
        disabled={!createEntry.isPending || !isFromValid}
        className='btn btn-xs btn-primary lg:btn-md'
      >

        <div>

        </div>


      </button>
    </div>
  )
}

export function CounterList() {
  const { accounts, getProgramAccount } = useCounterProgram()

  if (getProgramAccount.isLoading) {
    return <span className="loading loading-spinner loading-lg"></span>
  }
  if (!getProgramAccount.data?.value) {
    return (
      <div className="alert alert-info flex justify-center">
        <span>Program account not found. Make sure you have deployed the program and are on the correct cluster.</span>
      </div>
    )
  }
  return (
    <div className={'space-y-6'}>
      {accounts.isLoading ? (
        <span className="loading loading-spinner loading-lg"></span>
      ) : accounts.data?.length ? (
        <div className="grid md:grid-cols-2 gap-4">
          {accounts.data?.map((account) => (
            <CounterCard key={account.publicKey.toString()} account={account.publicKey} />
          ))}
        </div>
      ) : (
        <div className="text-center">
          <h2 className={'text-2xl'}>No accounts</h2>
          No accounts found. Create one above to get started.
        </div>
      )}
    </div>
  )
}

function CounterCard({ account }: { account: PublicKey }) {
  const { accountQuery, updateEntry, deleteEntry } = useCounterProgramAccount({
    account,
  })

  const {publicKey} = useWallet();

  const [message, setMessage] = useState("");
  const title = accountQuery.data?.title;

  const isFromValid = message.trim() != '';

  const handleSubmit = () => {
    if (!publicKey && isFromValid && title){
      updateEntry.mutateAsync({title, message, owner: publicKey});
     }
  }

  if (!publicKey){
    return <p>Connects your wallet.</p>
  }

  return accountQuery.isLoading ? (
    <span className='loading, loading-spinner loading-lg'></span>
  ) : (
    <div>
      <div>
        <div className='space-y-6'></div>
        <h2 onClick={() => accountQuery.refetch()}>{accountQuery.data?.title}</h2>

        <p>{accountQuery.data?.message}</p>
        <div>
          <textarea
            placeholder='messsage'
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className='textarea textarea-boardred w-full max-w-xs'
          >

          </textarea>
          <button
            onClick={handleSubmit}
            disabled={updateEntry.isPending || !isFromValid}
            className='btn btn-xs lg:btn-md btn-primary'
          >Update journal entry</button>

          <button
            onClick={() => {
              const title = accountQuery.data?.title;

              if(title){
                return deleteEntry.mutateAsync(title)
              }

            }}
            disabled={deleteEntry.isPending}
            className='btn btn-xs lg:btn-md btn-primary'
          >delete </button>
        </div>
      </div>
    </div>
  )

}

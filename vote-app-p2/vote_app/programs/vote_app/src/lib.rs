use anchor_lang::prelude::*;

declare_id!("7d5Z24YfXgSDw6tuKkwDXZqkxt55JNLsBsmvQ3hqrqgS");

#[program]
pub mod vote_app {
    use super::*;

    pub fn initialize_poll(ctx: Context<InitializePoll>, poll_id: u8, description: String) -> Result<()> {
        let clock = Clock::get()?;
        let current_time = clock.unix_timestamp;

        let poll = &mut ctx.accounts.poll_account;
        poll.poll_id = poll_id;
        poll.poll_description = description;
        poll.poll_start = current_time;
        poll.poll_end = current_time + 60;
        poll.candidate_amount = 0;
        Ok(())
    }

    pub fn initialize_candidate(ctx: Context<InitializeCandidate>, candidate_name: String, poll_id: u8) -> Result<()> {
        let candidate_account = &mut ctx.accounts.candidate_account;
        let poll_account = &mut ctx.accounts.poll;
        poll_account.candidate_amount = poll_account.candidate_amount + 1;
        candidate_account.candidate_name = candidate_name;
        candidate_account.candidate_poll_id = poll_id;
        candidate_account.candidate_votes = 0;
        Ok(())
    }

    pub fn vote(ctx: Context<Vote>, _candidate_name: String, _poll_id: u8) -> Result<()> {

        let candidate_account = &mut ctx.accounts.candidate_account;
        let poll_account = &mut ctx.accounts.poll;

        let clock = Clock::get()?;
        require!(clock.unix_timestamp < poll_account.poll_end, VoteError::Timeout);

        candidate_account.candidate_votes += 1;
        Ok(())
    }
}


#[derive(Accounts)]
#[instruction(poll_id: u8)]
pub struct InitializePoll<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,

    #[account(
        init,
        payer = signer,
        space = 8 + Poll::INIT_SPACE,
        seeds = [poll_id.to_be_bytes().as_ref()],
        bump
    )]
    pub poll_account: Account<'info, Poll>,

    pub system_program: Program<'info, System>
}

#[account]
#[derive(InitSpace)]
pub struct Poll {
    pub poll_id: u8,
    #[max_len(280)]
    pub poll_description: String,
    pub poll_start: i64,
    pub poll_end: i64,
    pub candidate_amount: u64
}

#[derive(Accounts)]
#[instruction(candidate_name: String, poll_id: u8)]
pub struct InitializeCandidate<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,

    #[account(
        init, 
        payer = signer,
        space = 8 + Candidate::INIT_SPACE,
        seeds = [candidate_name.as_bytes(), poll_id.to_be_bytes().as_ref()],
        bump
    )]
    pub candidate_account: Account<'info, Candidate>,

    #[account(
        mut,
        seeds = [poll_id.to_be_bytes().as_ref()],
        bump
    )]
    pub poll: Account<'info, Poll>,

    pub system_program: Program<'info, System>
}


#[account]
#[derive(InitSpace)]
pub struct Candidate {
    #[max_len(50)]
    pub candidate_name: String,
    pub candidate_poll_id: u8,
    pub candidate_votes: u64,
}


#[derive(Accounts)]
#[instruction(candidate_name: String, poll_id: u8)]
pub struct Vote<'info> {
    #[account(
        mut, 
        seeds = [candidate_name.as_bytes(), poll_id.to_be_bytes().as_ref()],
        bump
    )]
    pub candidate_account: Account<'info, Candidate>,

    #[account(
        seeds = [poll_id.to_be_bytes().as_ref()],
        bump
    )]
    pub poll: Account<'info, Poll>,
}

#[error_code]
pub enum VoteError {
    #[msg("Time out")]
    Timeout
}
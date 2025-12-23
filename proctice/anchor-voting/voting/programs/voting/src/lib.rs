use anchor_lang::prelude::*;

declare_id!("FmRjtdBY9PHEzpXtYY2TPrxqpJ4nd65xPLzEB6faDjGa");

#[program]
pub mod voting {
    use super::*;

    pub fn initialize(
        ctx: Context<InitializePoll>,
        poll_id: u64,
        description: String,
        poll_start: u64,
        poll_end: u64,
    ) -> Result<()> {
        let poll = &mut ctx.accounts.poll;

        poll.poll_id = poll_id;
        poll.description = description;
        poll.poll_start = poll_start;
        poll.poll_end = poll_end;
        poll.candidate_amount = 0;

        Ok(())
    }

    pub fn candidate(
        ctx: Context<InitCandidate>,
        _poll_id: u64,
        candidate_name: String,
    ) -> Result<()> {
        let poll = &mut ctx.accounts.poll;
        let candidate = &mut ctx.accounts.candidate;

        poll.candidate_amount += 1;

        candidate.candidate_name = candidate_name;
        candidate.candidate_votes = 0;

        Ok(())
    }

    pub fn vote(
        ctx: Context<Vote>,
        _poll_id: u64,
        _candidate_name: String,
    ) -> Result<()> {
        let poll = &ctx.accounts.poll;
        let candidate = &mut ctx.accounts.candidate;

        let clock = Clock::get()?;
        require!(
            clock.unix_timestamp as u64 >= poll.poll_start
                && clock.unix_timestamp as u64 <= poll.poll_end,
            ErrorCode::PollNotActive
        );

        candidate.candidate_votes += 1;
        Ok(())
    }
}


#[derive(Accounts)]
#[instruction(poll_id: u64)]
pub struct InitializePoll<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,

    #[account(
        init,
        payer = signer,
        space = 8 + PollDetails::INIT_SPACE,
        seeds = [poll_id.to_le_bytes().as_ref()],
        bump
    )]
    pub poll: Account<'info, PollDetails>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(poll_id: u64, candidate_name: String)]
pub struct InitCandidate<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,

    #[account(
        mut,
        seeds = [poll_id.to_le_bytes().as_ref()],
        bump
    )]
    pub poll: Account<'info, PollDetails>,

    #[account(
        init,
        payer = signer,
        space = 8 + CandidateDetails::INIT_SPACE,
        seeds = [poll_id.to_le_bytes().as_ref(), candidate_name.as_bytes()],
        bump
    )]
    pub candidate: Account<'info, CandidateDetails>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(poll_id: u64, candidate_name: String)]
pub struct Vote<'info> {
    pub signer: Signer<'info>,

    #[account(
        mut,
        seeds = [poll_id.to_le_bytes().as_ref()],
        bump
    )]
    pub poll: Account<'info, PollDetails>,

    #[account(
        mut,
        seeds = [poll_id.to_le_bytes().as_ref(), candidate_name.as_bytes()],
        bump
    )]
    pub candidate: Account<'info, CandidateDetails>,
}



#[account]
#[derive(InitSpace)]
pub struct CandidateDetails {
    #[max_len(20)]
    pub candidate_name: String,
    pub candidate_votes: u64,
}

#[account]
#[derive(InitSpace)]
pub struct PollDetails {
    pub poll_id: u64,

    #[max_len(250)]
    pub description: String,

    pub poll_start: u64,
    pub poll_end: u64,
    pub candidate_amount: u64,
}



#[error_code]
pub enum ErrorCode {
    #[msg("Poll is not active")]
    PollNotActive,
}

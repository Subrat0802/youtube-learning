use anchor_lang::prelude::*;

declare_id!("8B8WDQFsNru5EZm7xcjUPhwd35SuViW85gwxJa9Qwe4L");

#[program]
pub mod crud {
    use super::*;

    pub fn create_journal_entry(ctx: Context<InitializeJournal>, title: String, message:String) -> Result<()>{
        let journal_entry_account = &mut ctx.accounts.journal_entry_account;
        
        journal_entry_account.owner = *ctx.accounts.owner.key;
        journal_entry_account.title = title;
        journal_entry_account.message = message;
        
        Ok(())
    }

    pub fn update_journal_entry(ctx: Context<UpdateJournal>,_title: String, message: String) -> Result<()>{
        let journal_entry_account = &mut ctx.accounts.journal_entry_account;
        journal_entry_account.message = message;

        Ok(())
    }

    pub fn delete_journal(_ctx:Context<DeleteJournal>, _title: String) -> Result<()> {
        Ok(())
    }
    
}


#[derive(Accounts)]
#[instruction(title: String)]
pub struct InitializeJournal<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,

    #[account(
        init,
        payer = owner,
        space = 8 + JournalEntryState::INIT_SPACE,
        seeds = [title.as_bytes().as_ref(), owner.key().as_ref()],
        bump
    )]
    pub journal_entry_account: Account<'info, JournalEntryState>,

    pub system_program: Program<'info, System>
}

#[derive(Accounts)]
#[instruction(title: String)]
pub struct UpdateJournal<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,

    #[account(
        mut,
        seeds = [title.as_bytes().as_ref(), owner.key().as_ref()],
        bump,
        realloc = 8 + JournalEntryState::INIT_SPACE,
        realloc::payer = owner,
        realloc::zero = true
    )]
    pub journal_entry_account: Account<'info, JournalEntryState>,

    pub system_program: Program<'info, System>
}


#[derive(Accounts)]
#[instruction(title: String)]
pub struct DeleteJournal<'info> {
    #[account(
        mut,
        seeds = [title.as_bytes().as_ref(), owner.key().as_ref()],
        bump,
        close = owner
    )]
    pub journal_entry_account: Account<'info, JournalEntryState>,

    #[account(mut)]
    pub owner: Signer<'info>,

    pub system_program: Program<'info, System>
}

#[account]
#[derive(InitSpace)]
pub struct JournalEntryState {
    pub owner: Pubkey,
    #[max_len(50)]
    pub title: String,
    #[max_len(250)]
    pub message: String
}


use anchor_lang::prelude::*;
mod state;
mod contexts;
use contexts::*;
use anchor_lang::system_program;
mod errors;
use errors::*;
use anchor_spl::token::{mint_to, transfer as token_transfer, Transfer as TokenTransfer,};

declare_id!("Ev95CEbNDVqaEdUHBYwBEN2S6VEGUhinvpfwpUacXQSH");

#[program]
pub mod vote_app {
    use anchor_spl::token::MintTo;

    use super::*;

    pub fn initializ_treasury(ctx: Context<InitializeTreasury>, sol_price: u64, token_per_purchase: u64) -> Result<()> {
        let treasury_config_account = &mut ctx.accounts.treasury_config_account;
        treasury_config_account.authority = ctx.accounts.authority.key();
        treasury_config_account.bump = ctx.bumps.sol_vault;
        treasury_config_account.sol_price = sol_price;
        treasury_config_account.x_mint = ctx.accounts.x_mint.key();
        treasury_config_account.token_per_purchase = token_per_purchase;
        treasury_config_account.treasury_token_account = ctx.accounts.treasury_token_account.key();

        let proposal_counter_account = &mut ctx.accounts.proposal_counter_account;
        require!(proposal_counter_account.proposal_count == 0, VoteError::ProposalCounterAlreadyInitialized);
        proposal_counter_account.proposal_count = 1;
        proposal_counter_account.authority = ctx.accounts.authority.key();
        Ok(())
    }

    pub fn buy_tokens(ctx: Context<BuyTokens>) -> Result<()> {
        let treasury_config_account = &mut ctx.accounts.treasury_config_account;
        let sol = treasury_config_account.sol_price;
        let token_amount = treasury_config_account.token_per_purchase;

        //transfer sol from buyer token account to sol_vault account
        let transfer_ix = anchor_lang::system_program::Transfer{
            from: ctx.accounts.buyer.to_account_info(),
            to: ctx.accounts.sol_vault.to_account_info()
        };
        system_program::transfer(
            CpiContext::new(ctx.accounts.system_program.to_account_info(), transfer_ix), 
            sol
        )?;

        //now mint token to buyer token account
        let mint_authority_seeds = &[b"mint_authority".as_ref(), &[ctx.bumps.mint_authority]];
        let signer_seeds = &[&mint_authority_seeds[..]];

        let cpi_accounts = MintTo{
            mint: ctx.accounts.x_mint.to_account_info(),
            to: ctx.accounts.buyer_token_account.to_account_info(),
            authority: ctx.accounts.mint_authority.to_account_info()
        };

        let cpi_ctx = CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            cpi_accounts,
            signer_seeds
        );

        mint_to(cpi_ctx, token_amount)?;
        Ok(())
    }

    pub fn register_voter(ctx: Context<RegisterVoter>) -> Result<()> {
        let voter_account = &mut ctx.accounts.voter_account;
        voter_account.voter_id = ctx.accounts.authority.key();
        Ok(())
    }

    pub fn register_proposal(ctx: Context<RegisterProposal>, proposal_info: String, deadline: i64, token_amount: u64) -> Result<()>{
        let clock = Clock::get()?;
        require!(deadline > clock.unix_timestamp, VoteError::InvalideDeadline);

        let proposal_account = &mut ctx.accounts.proposal_account;


        let cpi_accounts = TokenTransfer {
            from: ctx.accounts.proposal_token_account.to_account_info(),
            to:ctx.accounts.treasury_token_account.to_account_info(),
            authority: ctx.accounts.authority.to_account_info()
        };

        let cpi_ctx = CpiContext::new(
            ctx.accounts.token_program.to_account_info(), 
            cpi_accounts    
        );

        token_transfer(cpi_ctx, token_amount)?;

        proposal_account.authority = ctx.accounts.authority.key();
        proposal_account.deadline = deadline;
        proposal_account.proposal_info = proposal_info;

        let proposal_counter_account = &mut ctx.accounts.proposal_counter_account;
        proposal_account.proposal_id = proposal_counter_account.proposal_count;

        proposal_counter_account.proposal_count = proposal_counter_account.proposal_count.checked_add(1).ok_or(VoteError::ProposalCounterOverflow)?;

        Ok(())
    }

}


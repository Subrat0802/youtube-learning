use anchor_lang::prelude::*;
mod state;
mod contexts;
mod errors;
use errors::*;
// use contexts::*;
// use anchor_spl::token::{
//     mint_to,
//     transfer as token_transfer,
//     MintTo,
//     Transfer as TokenTransfer,
// };
// use anchor_lang::system_program;

declare_id!("51gaMYTFYY4jyCdrePV6Jp3Rv4D5Y9xvkGas8fNRAvSM");

#[program]
pub mod vote_app {
    use super::*;

    pub fn initialize_treasury(ctx: Context<InitializeTreasury>, sol_price: u64, token_per_purchase: u64,  ) -> Result<()> {
        let treasury_config_account = &mut ctx.accounts.treasury_config_account;
        treasury_config_account.authority = ctx.accounts.authority.key();
        treasury_config_account.bump = ctx.bumps.sol_vault;
        treasury_config_account.sol_price = sol_price;
        treasury_config_account.x_mint = ctx.accounts.x_mint.key();
        treasury_config_account.token_per_purchase = token_per_purchase;
        Ok(())
    }

    pub fn buy_tokens(ctx:Context<BuyTokens>) -> Result<()> {
        //buyer will transfer SOL to sol_vault

        //1. treasury config account - sol price and token amount to transfer
        let treasury_config_account = &mut ctx.accounts.treasury_config_account;
        let sol = treasury_config_account.sol_price;
        let token_amount = treasury_config_account.token_per_purchase;

        let transfer_ix = anchor_lang::system_program::Transfer{
            from: ctx.accounts.buyer.to_account_info(),
            to: ctx.accounts.sol_vault.to_account_info()
        };
        system_program::transfer(
            CpiContext::new(ctx.accounts.system_program.to_account_info(), transfer_ix),
            sol
        )?;

        //2. Mint tokens to buyer_token_accoount
        // let mint_authority_seeds: &[&[u8]] = &[b"mint_authority",&[ctx.bumps.mint_authority]];
        let mint_authority_seeds = &[b"mint_authority".as_ref() ,&[ctx.bumps.mint_authority]];
        let signer_seeds = &[&mint_authority_seeds[..]];

        let cpi_accounts = MintTo{
            mint:ctx.accounts.x_mint.to_account_info(),
            to:ctx.accounts.buyer_token_account.to_account_info(),
            authority:ctx.accounts.mint_authority.to_account_info()
        };

        let cpi_ctx = CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            cpi_accounts, 
            signer_seeds
        );

        //3. X mint token
        mint_to(cpi_ctx, token_amount)?;
        Ok(())
    }

    pub fn register_voter(ctx: Context<RegisterVoter>) -> Result<()> {
        let voter_account = &mut ctx.accounts.voter_account;
        voter_account.voter_id = ctx.accounts.authority.key();
        Ok(())
    }

    pub fn register_proposal(ctx: Context<RegisterProposal>, proposal_info: String, deadline: i64, token_amount: u64) -> Result<()> {
        let clock = Clock::get()?;
        require!(deadline > clock.unix_timestamp, VoteError::InvalidDeadline);

        let proposal_account = &mut ctx.accounts.proposal_account;

        //transfer tokens from propsal token account to treasury account
        let cpi_accounts = TokenTransfer {
            from: ctx.accounts.proposal_token_account.to_account_info(),
            to: ctx.accounts.treasury_token_account.to_account_info(),
            authority: ctx.accounts.authority.to_account_info(),
        };

        let cpi_ctx = CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            cpi_accounts,
        );

        token_transfer(cpi_ctx, token_amount)?;

        proposal_account.authoruty = ctx.accounts.authority.key();
        // proposal_account.proposal_id = ;
        // proposal_account.deadline = deadline;
        // proposal_account.proposal_info = proposal_info;
        // proposal_account.number_of_votes = 0;
        Ok(())
    }
}

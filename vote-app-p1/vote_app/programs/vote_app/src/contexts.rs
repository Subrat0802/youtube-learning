use anchor_lang::prelude::*;
use crate::state::*;
use anchor_spl::{associated_token::AssociatedToken, token::{Mint, Token, TokenAccount}};

#[derive(Accounts)]
pub struct InitializeTreasury<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    //create treasury account first acocunt
    #[account(
        init,
        payer = authority,
        space = 8 + TreasuryConfig::INIT_SPACE,
        seeds=[b"treasury_config"],
        bump
    )]
    pub treasury_config_account: Account<'info, TreasuryConfig>,

    
    #[account(
        init,
        payer = authority,
        mint::authority = mint_authority,
        mint::decimals = 6,
        seeds=[b"x_mint"],
        bump
    )]
    pub x_mint: Account<'info, Mint>,  

    #[account(
        init,
        payer = authority,
        associated_token::mint = x_mint,
        associated_token::authority = authority,
    )]
    pub treasury_token_account: Account<'info, TokenAccount>,

    // #[account(
    //     init,
    //     payer = authority,
    //     space = 8 + ProposalCounter::INIT_SPACE,
    //     seeds=[b"proposal_counter"],
    //     bump
    // )]
    // pub proposal_counter_account: Account<'info, ProposalCounter>,

    /// CHECK: This is to recieve SOL tokens
    #[account(mut, seeds=[b"sol_vault"], bump)]
    pub sol_vault: AccountInfo<'info>, //UncheckedAccount

    /// CHECK: This is going to be the mint authority of x_mint tokens
    #[account(seeds=[b"mint_authority"], bump)]
    pub mint_authority: AccountInfo<'info>, //UncheckedAccount

    pub token_program: Program<'info, Token>,

    pub associated_token_program: Program<'info, AssociatedToken>,

    pub system_program: Program<'info, System>
}



#[derive(Accounts)]
pub struct BuyTokens<'info> {
    #[account(
        seeds = [b"treasury_config"],
        bump,
        constraint = treasury_config_account.x_mint == x_mint.key()
    )]
    pub treasury_config_account: Account<'info, TreasuryConfig>,

    /// CHECK: This is to recieve SOL tokens
    #[account(mut, seeds = [b"sol_vault"], bump=treasury_config_account.bump)]
    pub sol_vault: AccountInfo<'info>,

    //from here transfer token to users
    #[account(mut)]
    pub treasury_token_account: Account<'info, TokenAccount>,

    #[account(mut)]
    pub x_mint: Account<'info, Mint>,

    #[account(
        mut,
        constraint = buyer_token_account.owner == buyer.key(),
        constraint = buyer_token_account.mint == x_mint.key()
    )]
    pub buyer_token_account: Account<'info, TokenAccount>,

    /// CHECK: This is going to be the mint authority of x_mint tokens
    #[account(seeds=[b"mint_authority"], bump)]
    pub mint_authority: AccountInfo<'info>,

    #[account(mut)]
    pub buyer: Signer<'info>,

    pub token_program: Program<'info, Token>,

    pub system_program: Program<'info, System>
}



#[derive(Accounts)]
pub struct RegisterVoter<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    //create treasury account first acocunt
    #[account(
        init,
        payer = authority,
        space = 8 + Voter::INIT_SPACE,
        seeds=[b"voter", authority.key.as_ref()],
        bump
    )]
    pub voter_account: Account<'info, Voter>,

    pub system_program: Program<'info, System>
}
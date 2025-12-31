use anchor_lang::prelude::*;

#[event]
pub struct VoterAccountClosed {
    pub voter: Pubkey,
    pub rent_recovered_to: Pubkey,
    pub timestamp: i64
}
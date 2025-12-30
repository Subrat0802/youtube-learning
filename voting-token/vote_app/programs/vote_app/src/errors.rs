use anchor_lang::prelude::*;
#[error_code]
pub enum VoteError {
    #[msg("Invalid deasdline")]
    InvalidDeadline
}
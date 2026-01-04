use anchor_lang::prelude::*;
#[error_code]
pub enum VoteError {
    #[msg("Invalid deasdline")]
    InvalidDeadline,

    #[msg("proposal counter is already initialized")]
    ProposalCounterAlreadyInitialized,

    #[msg("proposal counter overflow")]
    ProposalCounterOverflow,

    #[msg("proposal ende")]
    ProposalEnded,

    #[msg("proposal vote overflow")]
    ProposalVotesOverflow,

    #[msg("proposal voting still active")]
    VotingStillActive,

    #[msg("proposal has no votes cast")]
    NoVotesCast,

    #[msg("un authorized account")]
    UnAuthorizedAccess
}
use anchor_lang::prelude::*;

#[error_code]
pub enum VoteError {

    #[msg("Invalid deasdline")]
    InvalideDeadline,

    #[msg("Proposal Counter is already initialized")]
    ProposalCounterAlreadyInitialized,

    #[msg("Proposal Count overflow")]
    ProposalCounterOverflow,

    #[msg("Proposal ended")]
    ProposalEnded,

    #[msg("Proposal vote overflow")]
    ProposalVotesOverFlow,

    #[msg("Voting still active")]
    VotingStillActive,

    #[msg("Zero votes")]
    NoVotesCast

}
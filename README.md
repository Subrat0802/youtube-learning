# youtube-learning


 - favourite prgram
    use anchor_lang::prelude::*;

    declare_id!("kG1Q8QamahLRX6zqDkEZc6Jcx49RFgwQC9ReRCHa3XW"); 

    pub const ANCHOR_DESCRIMINATOR_SIZE: usize = 8;

    #[program]
    pub mod favourites {
        use super::*;

        pub fn set_favouites(
                context: Context<SetFavourites>, 
                number: u64, 
                color: String, 
                hobbies:Vec<String>
            ) -> Result<()> {
            msg!("Greeting from {}", context.program_id);
            let user_public_key = context.accounts.user.key();

            msg!("User {user_public_key}'s favourite number is: {number}, 
                favourite color is: {color}, and
                favourite hobbies are: {hobbies:?}");

            context.accounts.favourites.set_inner(Favourites {
                number,
                color,
                hobbies
            });

            Ok(())
        }
    }

    #[account] //bcz we want to save this in account. thats why we add here account macro
    #[derive(InitSpace)] //anchor know how big favourites is 
    pub struct Favourites {

        pub number: u64,

        #[max_len(50)] //here we specify what the max size of this string
        pub color: String,
        #[max_len(5, 50)] //here we specify what the max size of this string
        pub hobbies: Vec<String>
    }

    #[derive(Accounts)]
    pub struct SetFavourites<'info> {
        #[account(mut)]
        pub user: Signer<'info>,

        #[account(
            init_if_needed,
            payer = user,
            space = ANCHOR_DESCRIMINATOR_SIZE + Favourites::INIT_SPACE,
            seeds = [b"favourites", user.key().as_ref()],
            bump
        )]
        pub favourites: Account<'info, Favourites>,

        pub system_program: Program<'info, System>
    }
#![no_std]
mod test;
use soroban_sdk::{
    contract, contractimpl, contracttype, symbol_short, Address, Env, String,
    log,
};

#[contracttype]
#[derive(Clone)]
pub struct Campaign {
    pub creator: Address,
    pub title: String,
    pub desc: String,
    pub target: i128,
    pub deadline: u64,
    pub raised: i128,
    pub claimed: bool,
}

#[contracttype]
pub enum DataKey {
    Campaign(u32),
    CampCount,
    Donors(u32),
}

#[contract]
pub struct CrowdfundContract;

#[contractimpl]
impl CrowdfundContract {
    /// Initialize the contract
    pub fn init(env: Env) {
        env.storage().instance().set(&DataKey::CampCount, &0u32);
    }

    /// Create a new crowdfunding campaign
    pub fn create(
        env: Env,
        creator: Address,
        title: String,
        desc: String,
        target: i128,
        deadline: u64,
    ) -> u32 {
        creator.require_auth();

        let count: u32 = env
            .storage()
            .instance()
            .get(&DataKey::CampCount)
            .unwrap_or(0);

        let campaign = Campaign {
            creator: creator.clone(),
            title,
            desc,
            target,
            deadline,
            raised: 0,
            claimed: false,
        };

        env.storage()
            .persistent()
            .set(&DataKey::Campaign(count), &campaign);
        env.storage()
            .instance()
            .set(&DataKey::CampCount, &(count + 1));

        // Emit event
        env.events()
            .publish((symbol_short!("create"),), (count, creator));

        log!(&env, "Campaign {} created", count);
        count
    }

    /// Donate to a campaign - records donation amount on-chain
    pub fn donate(env: Env, donor: Address, campaign_id: u32, amount: i128) {
        donor.require_auth();

        assert!(amount > 0, "Amount must be positive");

        let mut campaign: Campaign = env
            .storage()
            .persistent()
            .get(&DataKey::Campaign(campaign_id))
            .expect("Campaign not found");

        let now = env.ledger().timestamp();
        if now > campaign.deadline {
            panic!("Campaign has ended");
        }

        // Check if campaign has already reached target
        if campaign.raised >= campaign.target {
            panic!("Campaign has already reached its target");
        }

        // Check if donation would exceed target
        if campaign.raised + amount > campaign.target {
            panic!("Donation would exceed campaign target");
        }

        campaign.raised += amount;
        env.storage()
            .persistent()
            .set(&DataKey::Campaign(campaign_id), &campaign);

        env.events()
            .publish((symbol_short!("donate"),), (campaign_id, donor, amount));

        log!(&env, "Donation of {} to campaign {}", amount, campaign_id);
    }

    /// Get campaign details
    pub fn get_campaign(env: Env, campaign_id: u32) -> Campaign {
        env.storage()
            .persistent()
            .get(&DataKey::Campaign(campaign_id))
            .expect("Campaign not found")
    }

    /// Get total number of campaigns
    pub fn get_count(env: Env) -> u32 {
        env.storage()
            .instance()
            .get(&DataKey::CampCount)
            .unwrap_or(0)
    }

    /// Claim funds from a successful campaign
    pub fn claim(env: Env, campaign_id: u32) {
        let mut campaign: Campaign = env
            .storage()
            .persistent()
            .get(&DataKey::Campaign(campaign_id))
            .expect("Campaign not found");

        campaign.creator.require_auth();

        if campaign.claimed {
            panic!("Already claimed");
        }

        let now = env.ledger().timestamp();
        if now <= campaign.deadline {
            panic!("Campaign still active");
        }

        campaign.claimed = true;
        env.storage()
            .persistent()
            .set(&DataKey::Campaign(campaign_id), &campaign);

        // Emit event
        env.events().publish(
            (symbol_short!("claim"),),
            (campaign_id, campaign.creator.clone(), campaign.raised),
        );

        log!(&env, "Campaign {} claimed by creator", campaign_id);
    }
}

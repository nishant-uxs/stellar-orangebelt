#![cfg(test)]

use super::*;
use soroban_sdk::{
    testutils::{Address as _, Ledger},
    Address, Env, String,
};

fn create_env() -> Env {
    Env::default()
}

fn register_contract(env: &Env) -> Address {
    env.register_contract(None, CrowdfundContract)
}

fn make_string(env: &Env, s: &str) -> String {
    String::from_str(env, s)
}


// ─── init ────────────────────────────────────────────────────────────────────

#[test]
fn test_init() {
    let env = create_env();
    let contract_id = register_contract(&env);
    let client = CrowdfundContractClient::new(&env, &contract_id);

    client.init();
    assert_eq!(client.get_count(), 0);
}

#[test]
fn test_double_init_resets_count() {
    let env = create_env();
    env.mock_all_auths();

    let contract_id = register_contract(&env);
    let client = CrowdfundContractClient::new(&env, &contract_id);

    client.init();
    assert_eq!(client.get_count(), 0);

    client.init();
    assert_eq!(client.get_count(), 0);
}

// ─── create ──────────────────────────────────────────────────────────────────

#[test]
fn test_create_campaign() {
    let env = create_env();
    env.mock_all_auths();

    let contract_id = register_contract(&env);
    let client = CrowdfundContractClient::new(&env, &contract_id);
    client.init();

    let creator = Address::generate(&env);
    let deadline: u64 = env.ledger().timestamp() + 86400; // 1 day from now

    let id = client.create(
        &creator,
        &make_string(&env, "Test Campaign"),
        &make_string(&env, "A test description"),
        &1_000_000_000i128, // 100 XLM in stroops
        &deadline,
    );

    assert_eq!(id, 0);
    assert_eq!(client.get_count(), 1);
}

#[test]
fn test_create_multiple_campaigns() {
    let env = create_env();
    env.mock_all_auths();

    let contract_id = register_contract(&env);
    let client = CrowdfundContractClient::new(&env, &contract_id);
    client.init();

    let creator = Address::generate(&env);
    let deadline: u64 = env.ledger().timestamp() + 86400;

    let id0 = client.create(
        &creator,
        &make_string(&env, "Campaign 0"),
        &make_string(&env, "Desc 0"),
        &500_000_000i128,
        &deadline,
    );
    let id1 = client.create(
        &creator,
        &make_string(&env, "Campaign 1"),
        &make_string(&env, "Desc 1"),
        &1_000_000_000i128,
        &deadline,
    );

    assert_eq!(id0, 0);
    assert_eq!(id1, 1);
    assert_eq!(client.get_count(), 2);
}

// ─── get_campaign ─────────────────────────────────────────────────────────────

#[test]
fn test_get_campaign() {
    let env = create_env();
    env.mock_all_auths();

    let contract_id = register_contract(&env);
    let client = CrowdfundContractClient::new(&env, &contract_id);
    client.init();

    let creator = Address::generate(&env);
    let deadline: u64 = env.ledger().timestamp() + 86400;
    let target: i128 = 2_000_000_000;

    client.create(
        &creator,
        &make_string(&env, "School Fund"),
        &make_string(&env, "Build a school"),
        &target,
        &deadline,
    );

    let campaign = client.get_campaign(&0u32);
    assert_eq!(campaign.creator, creator);
    assert_eq!(campaign.target, target);
    assert_eq!(campaign.raised, 0);
    assert!(!campaign.claimed);
}

#[test]
#[should_panic(expected = "Campaign not found")]
fn test_get_nonexistent_campaign_panics() {
    let env = create_env();
    let contract_id = register_contract(&env);
    let client = CrowdfundContractClient::new(&env, &contract_id);
    env.mock_all_auths();
    client.init();

    client.get_campaign(&99u32); // should panic
}

// ─── get_count ────────────────────────────────────────────────────────────────

#[test]
fn test_get_count_starts_at_zero() {
    let env = create_env();
    let contract_id = register_contract(&env);
    let client = CrowdfundContractClient::new(&env, &contract_id);
    env.mock_all_auths();
    client.init();

    assert_eq!(client.get_count(), 0);
}

// ─── claim ────────────────────────────────────────────────────────────────────

#[test]
#[should_panic(expected = "Campaign still active")]
fn test_claim_before_deadline_panics() {
    let env = create_env();
    env.mock_all_auths();

    let contract_id = register_contract(&env);
    let client = CrowdfundContractClient::new(&env, &contract_id);
    client.init();

    let creator = Address::generate(&env);
    let deadline: u64 = env.ledger().timestamp() + 86400;

    client.create(
        &creator,
        &make_string(&env, "Active Campaign"),
        &make_string(&env, "Still running"),
        &1_000_000_000i128,
        &deadline,
    );

    client.claim(&0u32); // should panic: campaign still active
}

#[test]
#[should_panic(expected = "Campaign not found")]
fn test_claim_nonexistent_panics() {
    let env = create_env();
    env.mock_all_auths();

    let contract_id = register_contract(&env);
    let client = CrowdfundContractClient::new(&env, &contract_id);
    client.init();

    client.claim(&0u32);
}

// ─── donate ───────────────────────────────────────────────────────────────────

#[test]
fn test_donate_increases_raised() {
    let env = create_env();
    env.mock_all_auths();

    let contract_id = register_contract(&env);
    let client = CrowdfundContractClient::new(&env, &contract_id);
    client.init();

    let creator = Address::generate(&env);
    let donor = Address::generate(&env);
    let deadline: u64 = env.ledger().timestamp() + 86400;
    let target: i128 = 1_000_000_000;

    client.create(
        &creator,
        &make_string(&env, "Fund Campaign"),
        &make_string(&env, "Raise funds"),
        &target,
        &deadline,
    );

    client.donate(&donor, &0u32, &100_000_000i128);

    let campaign = client.get_campaign(&0u32);
    assert_eq!(campaign.raised, 100_000_000i128);
}

#[test]
fn test_donate_multiple_times() {
    let env = create_env();
    env.mock_all_auths();

    let contract_id = register_contract(&env);
    let client = CrowdfundContractClient::new(&env, &contract_id);
    client.init();

    let creator = Address::generate(&env);
    let donor = Address::generate(&env);
    let deadline: u64 = env.ledger().timestamp() + 86400;

    client.create(
        &creator,
        &make_string(&env, "Multi Donate"),
        &make_string(&env, "Test multiple donations"),
        &1_000_000_000i128,
        &deadline,
    );

    client.donate(&donor, &0u32, &100_000_000i128);
    client.donate(&donor, &0u32, &200_000_000i128);

    let campaign = client.get_campaign(&0u32);
    assert_eq!(campaign.raised, 300_000_000i128);
}

#[test]
#[should_panic(expected = "Campaign has already reached its target")]
fn test_donate_after_target_reached_panics() {
    let env = create_env();
    env.mock_all_auths();

    let contract_id = register_contract(&env);
    let client = CrowdfundContractClient::new(&env, &contract_id);
    client.init();

    let creator = Address::generate(&env);
    let donor = Address::generate(&env);
    let deadline: u64 = env.ledger().timestamp() + 86400;
    let target: i128 = 100_000_000;

    client.create(
        &creator,
        &make_string(&env, "Small Campaign"),
        &make_string(&env, "Reach target fast"),
        &target,
        &deadline,
    );

    // Fill to target
    client.donate(&donor, &0u32, &100_000_000i128);
    // This should panic
    client.donate(&donor, &0u32, &1_000_000i128);
}

#[test]
#[should_panic(expected = "Donation would exceed campaign target")]
fn test_donate_exceeding_target_panics() {
    let env = create_env();
    env.mock_all_auths();

    let contract_id = register_contract(&env);
    let client = CrowdfundContractClient::new(&env, &contract_id);
    client.init();

    let creator = Address::generate(&env);
    let donor = Address::generate(&env);
    let deadline: u64 = env.ledger().timestamp() + 86400;

    client.create(
        &creator,
        &make_string(&env, "Capped Campaign"),
        &make_string(&env, "Cannot exceed target"),
        &100_000_000i128,
        &deadline,
    );

    // Donate more than target - should panic
    client.donate(&donor, &0u32, &200_000_000i128);
}

#[test]
#[should_panic(expected = "Campaign has ended")]
fn test_donate_after_deadline_panics() {
    let env = create_env();
    env.mock_all_auths();

    let contract_id = register_contract(&env);
    let client = CrowdfundContractClient::new(&env, &contract_id);
    client.init();

    let creator = Address::generate(&env);
    let donor = Address::generate(&env);
    // Set deadline in the past
    let deadline: u64 = env.ledger().timestamp();

    client.create(
        &creator,
        &make_string(&env, "Expired Campaign"),
        &make_string(&env, "Already ended"),
        &1_000_000_000i128,
        &deadline,
    );

    // Advance ledger time past deadline
    env.ledger().with_mut(|l| {
        l.timestamp += 10;
    });

    client.donate(&donor, &0u32, &100_000_000i128);
}

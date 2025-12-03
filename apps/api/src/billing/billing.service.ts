import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SupabaseService } from '../supabase/supabase.service';

export interface Subscription {
  id: string;
  user_id: string;
  plan: 'free' | 'paid';
  provider: 'paddle' | 'polar';
  provider_customer_id: string | null;
  provider_subscription_id: string | null;
  status: 'active' | 'past_due' | 'canceled' | 'trialing';
  current_period_start: string | null;
  current_period_end: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserBalance {
  id: string;
  user_id: string;
  balance_cents: number;
  total_spent_cents: number;
  created_at: string;
  updated_at: string;
}

export interface BalanceTransaction {
  id: string;
  user_id: string;
  amount_cents: number;
  type: 'initial_credit' | 'subscription_credit' | 'purchase' | 'call_charge' | 'refund' | 'adjustment';
  description: string | null;
  call_id: string | null;
  provider_payment_id: string | null;
  created_at: string;
}

@Injectable()
export class BillingService {
  private readonly logger = new Logger(BillingService.name);

  constructor(
    private supabaseService: SupabaseService,
    private configService: ConfigService,
  ) {}

  async getSubscription(userId: string): Promise<Subscription | null> {
    const supabase = this.supabaseService.getClient();

    const { data: subscription, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) {
      return null;
    }

    return subscription;
  }

  async getBalance(userId: string): Promise<UserBalance | null> {
    const supabase = this.supabaseService.getClient();

    const { data: balance, error } = await supabase
      .from('user_balances')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) {
      return null;
    }

    return balance;
  }

  async getTransactions(
    userId: string,
    limit: number = 20,
  ): Promise<BalanceTransaction[]> {
    const supabase = this.supabaseService.getClient();

    const { data: transactions, error } = await supabase
      .from('balance_transactions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      this.logger.error('Failed to fetch transactions:', error);
      return [];
    }

    return transactions || [];
  }

  async addBalance(
    userId: string,
    amountCents: number,
    type: BalanceTransaction['type'],
    description?: string,
    providerPaymentId?: string,
  ): Promise<boolean> {
    const supabase = this.supabaseService.getClient();

    // Update balance
    const { error: balanceError } = await supabase.rpc('add_balance', {
      p_user_id: userId,
      p_amount: amountCents,
    });

    if (balanceError) {
      this.logger.error('Failed to add balance:', balanceError);
      return false;
    }

    // Create transaction record
    const { error: transactionError } = await supabase
      .from('balance_transactions')
      .insert({
        user_id: userId,
        amount_cents: amountCents,
        type,
        description: description || null,
        provider_payment_id: providerPaymentId || null,
      });

    if (transactionError) {
      this.logger.error('Failed to create transaction:', transactionError);
    }

    return true;
  }

  async deductBalance(
    userId: string,
    amountCents: number,
    callId?: string,
    description?: string,
  ): Promise<boolean> {
    const supabase = this.supabaseService.getClient();

    // Check current balance first
    const balance = await this.getBalance(userId);
    if (!balance || balance.balance_cents < amountCents) {
      return false;
    }

    // Deduct balance
    const { error: balanceError } = await supabase.rpc('deduct_balance', {
      p_user_id: userId,
      p_amount: amountCents,
      p_call_id: callId || null,
    });

    if (balanceError) {
      this.logger.error('Failed to deduct balance:', balanceError);
      return false;
    }

    return true;
  }

  async updateSubscription(
    userId: string,
    updates: Partial<Pick<Subscription, 'plan' | 'status' | 'provider_customer_id' | 'provider_subscription_id' | 'current_period_start' | 'current_period_end'>>,
  ): Promise<Subscription | null> {
    const supabase = this.supabaseService.getClient();

    const { data: subscription, error } = await supabase
      .from('subscriptions')
      .update(updates)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      this.logger.error('Failed to update subscription:', error);
      return null;
    }

    return subscription;
  }

  async handleSubscriptionActivated(
    userId: string,
    providerCustomerId: string,
    providerSubscriptionId: string,
    periodEnd: Date,
  ): Promise<void> {
    await this.updateSubscription(userId, {
      plan: 'paid',
      status: 'active',
      provider_customer_id: providerCustomerId,
      provider_subscription_id: providerSubscriptionId,
      current_period_start: new Date().toISOString(),
      current_period_end: periodEnd.toISOString(),
    });

    this.logger.log(`Subscription activated for user ${userId}`);
  }

  async handleSubscriptionCanceled(userId: string): Promise<void> {
    await this.updateSubscription(userId, {
      plan: 'free',
      status: 'canceled',
    });

    this.logger.log(`Subscription canceled for user ${userId}`);
  }

  async isSubscribed(userId: string): Promise<boolean> {
    const subscription = await this.getSubscription(userId);
    return subscription?.plan === 'paid' && subscription?.status === 'active';
  }

  async hasBalance(userId: string, requiredCents: number = 0): Promise<boolean> {
    const balance = await this.getBalance(userId);
    return (balance?.balance_cents || 0) > requiredCents;
  }
}

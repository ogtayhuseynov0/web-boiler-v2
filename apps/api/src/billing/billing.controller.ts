import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { BillingService } from './billing.service';
import { SupabaseAuthGuard } from '../common/guards/supabase-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('billing')
@Controller('billing')
@UseGuards(SupabaseAuthGuard)
@ApiBearerAuth()
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  @Get('balance')
  @ApiOperation({ summary: 'Get user balance' })
  async getBalance(@CurrentUser() user: { id: string }) {
    const balance = await this.billingService.getBalance(user.id);

    return {
      balance_cents: balance?.balance_cents || 0,
      total_spent_cents: balance?.total_spent_cents || 0,
    };
  }

  @Get('subscription')
  @ApiOperation({ summary: 'Get user subscription' })
  async getSubscription(@CurrentUser() user: { id: string }) {
    const subscription = await this.billingService.getSubscription(user.id);

    return {
      plan: subscription?.plan || 'free',
      status: subscription?.status || 'active',
      current_period_end: subscription?.current_period_end || null,
      is_subscribed: subscription?.plan === 'paid' && subscription?.status === 'active',
    };
  }

  @Get('transactions')
  @ApiOperation({ summary: 'Get balance transactions' })
  async getTransactions(@CurrentUser() user: { id: string }) {
    const transactions = await this.billingService.getTransactions(user.id);

    return { transactions };
  }

  @Get('summary')
  @ApiOperation({ summary: 'Get billing summary (balance + subscription)' })
  async getSummary(@CurrentUser() user: { id: string }) {
    const [balance, subscription, transactions] = await Promise.all([
      this.billingService.getBalance(user.id),
      this.billingService.getSubscription(user.id),
      this.billingService.getTransactions(user.id, 5),
    ]);

    return {
      balance: {
        balance_cents: balance?.balance_cents || 0,
        total_spent_cents: balance?.total_spent_cents || 0,
      },
      subscription: {
        plan: subscription?.plan || 'free',
        status: subscription?.status || 'active',
        current_period_end: subscription?.current_period_end || null,
        is_subscribed: subscription?.plan === 'paid' && subscription?.status === 'active',
      },
      recent_transactions: transactions,
    };
  }

  @Post('checkout')
  @ApiOperation({ summary: 'Create checkout session for subscription' })
  async createCheckout(
    @CurrentUser() user: { id: string },
    @Body() body: { plan?: string },
  ) {
    // TODO: Implement Paddle/Polar checkout
    // This would create a checkout session and return the URL

    return {
      error: 'Checkout not yet implemented',
      message: 'Payment integration coming soon',
    };
  }

  @Post('top-up')
  @ApiOperation({ summary: 'Create checkout session for balance top-up' })
  async createTopUp(
    @CurrentUser() user: { id: string },
    @Body() body: { amount_cents: number },
  ) {
    // Check if user is subscribed (only subscribers can top up)
    const isSubscribed = await this.billingService.isSubscribed(user.id);

    if (!isSubscribed) {
      return {
        error: 'Subscription required',
        message: 'You must be subscribed to add balance',
      };
    }

    // TODO: Implement Paddle/Polar one-time payment
    return {
      error: 'Top-up not yet implemented',
      message: 'Payment integration coming soon',
    };
  }
}

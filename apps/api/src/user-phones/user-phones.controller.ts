import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { UserPhonesService } from './user-phones.service';
import { SupabaseAuthGuard } from '../common/guards/supabase-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('user-phones')
@Controller('user-phones')
@UseGuards(SupabaseAuthGuard)
@ApiBearerAuth()
export class UserPhonesController {
  constructor(private readonly userPhonesService: UserPhonesService) {}

  @Get()
  @ApiOperation({ summary: 'Get user phone numbers' })
  async getPhones(@CurrentUser() user: { id: string }) {
    const phones = await this.userPhonesService.getUserPhones(user.id);
    return { phones };
  }

  @Post()
  @ApiOperation({ summary: 'Add a phone number' })
  async addPhone(
    @CurrentUser() user: { id: string },
    @Body() body: { phone_number: string },
  ) {
    const result = await this.userPhonesService.addPhone(
      user.id,
      body.phone_number,
    );

    if (!result.success) {
      return { error: result.error };
    }

    return { success: true, phone: result.phone };
  }

  @Post(':id/send-code')
  @ApiOperation({ summary: 'Send verification code to phone' })
  async sendVerificationCode(
    @CurrentUser() user: { id: string },
    @Param('id') phoneId: string,
  ) {
    const result = await this.userPhonesService.sendVerificationCode(
      user.id,
      phoneId,
    );

    if (!result.success) {
      return { error: result.error };
    }

    return { success: true, message: 'Verification code sent' };
  }

  @Post(':id/verify')
  @ApiOperation({ summary: 'Verify phone with code' })
  async verifyPhone(
    @CurrentUser() user: { id: string },
    @Param('id') phoneId: string,
    @Body() body: { code: string },
  ) {
    const result = await this.userPhonesService.verifyCode(
      user.id,
      phoneId,
      body.code,
    );

    if (!result.success) {
      return { error: result.error };
    }

    return { success: true, message: 'Phone verified successfully' };
  }

  @Post(':id/set-primary')
  @ApiOperation({ summary: 'Set phone as primary' })
  async setPrimary(
    @CurrentUser() user: { id: string },
    @Param('id') phoneId: string,
  ) {
    const result = await this.userPhonesService.setPrimaryPhone(
      user.id,
      phoneId,
    );

    if (!result.success) {
      return { error: result.error };
    }

    return { success: true };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a phone number' })
  async deletePhone(
    @CurrentUser() user: { id: string },
    @Param('id') phoneId: string,
  ) {
    const result = await this.userPhonesService.deletePhone(user.id, phoneId);

    if (!result.success) {
      return { error: result.error };
    }

    return { success: true };
  }
}

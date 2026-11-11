import { Body, Controller, Delete, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { CurrentStore, StoreAccessGuard, type StoreAccess } from '../auth/store-access.guard.js';
import { AccountingService } from './accounting.service.js';
import { EntryInput, Period } from './accounting.schemas.js';

@Controller('admin/stores/:store/accounting')
@UseGuards(StoreAccessGuard)
export class AccountingController {
  constructor(private readonly accounting: AccountingService) {}

  // ?from=2026-11-01&to=2026-11-30
  @Get('report')
  report(@CurrentStore() store: StoreAccess, @Query({ schema: Period }) period: Period) {
    return this.accounting.report(store, period);
  }

  @Get('monthly')
  monthly(@CurrentStore() store: StoreAccess) {
    return this.accounting.monthly(store, 12);
  }

  @Post('entries')
  create(@CurrentStore() store: StoreAccess, @Body({ schema: EntryInput }) body: EntryInput) {
    return this.accounting.createEntry(store, body);
  }

  @Put('entries/:id')
  update(@CurrentStore() store: StoreAccess, @Param('id') id: string, @Body({ schema: EntryInput }) body: EntryInput) {
    return this.accounting.updateEntry(store, id, body);
  }

  @Delete('entries/:id')
  remove(@CurrentStore() store: StoreAccess, @Param('id') id: string) {
    return this.accounting.deleteEntry(store, id);
  }
}

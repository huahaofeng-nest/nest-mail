import { DynamicModule, Global, Module } from '@nestjs/common';
import { NestMailClient } from './nest-mail.client';
import { MailerOptions } from './interfaces/mailer-options.interface';
import { NEST_MAILER, NEST_MAILER_OPTIONS } from './nest-mail.constants';

@Global()
@Module({})
export class NestMailModule {
  public static forRoot(options?: MailerOptions): DynamicModule {
    return this.register(options);
  }

  public static register(options: MailerOptions = {}): DynamicModule {
    if (options.template && typeof options.template.adapter === 'string') {
      if (options.template.adapter === 'HandlebarsAdapter') {
        const { HandlebarsAdapter } = require('./adapters/handlebars.adapter');
        options.template.adapter = new HandlebarsAdapter();
      }
    }

    const mailerOptionsProvider = {
      provide: NEST_MAILER_OPTIONS,
      useValue: options,
    };

    const mailerProvider = {
      provide: NEST_MAILER,
      useFactory: (mailerOptions) => {
        return new NestMailClient(mailerOptions);
      },
      inject: [NEST_MAILER_OPTIONS],
    };

    return {
      module: NestMailModule,
      providers: [mailerOptionsProvider, mailerProvider],
      exports: [mailerProvider],
    };
  }
}

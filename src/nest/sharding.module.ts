import { Module, Global, DynamicModule } from '@nestjs/common';
import { ShardingDataSourceOptions } from '../types/typeorm-sharding.type';
import { ShardingManager } from '../sharding-manager';
import { RepositoryService } from '../repository-service/repository-service';
import { MetadataUtils } from 'typeorm/metadata-builder/MetadataUtils';
import { ShardingBaseEntity, getRepositoryToken } from '..';
import { BaseEntity } from 'typeorm';

@Global()
@Module({})
export class ShardingModule {
    static forRoot(options: ShardingDataSourceOptions): DynamicModule {
        return {
            module: ShardingModule,
            providers: [
                {
                    provide: 'SHARDING_OPTIONS',
                    useValue: options
                },
                {
                    provide: ShardingManager,
                    useFactory: (opts: ShardingDataSourceOptions) => {
                      return ShardingManager.createInstance(opts);
                    },
                    inject: ['SHARDING_OPTIONS']
                },
                RepositoryService
            ],
            exports: [ShardingManager, RepositoryService]
        };
    }

    static forFeature(entities: (typeof BaseEntity | typeof ShardingBaseEntity)[]): DynamicModule {
      const providers = entities.map(entity => {
          const repositoryToken =  getRepositoryToken(entity); 
          return {
              provide: repositoryToken,
              useFactory: () => RepositoryService.of(entity),
          };
      });
    
      return {
          module: ShardingModule,
          providers,
          exports: providers,
      };
    }
    
  
}

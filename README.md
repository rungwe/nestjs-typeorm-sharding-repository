# NestJS TypeORM Sharding Module
- This module extends TypeORM capabilities to support distributed database environments with List and Range-based sharding strategies in a NestJS application.

## Motivation
The development of this library was driven by the need for robust sharding or  multi-tenancy support in web applications. Traditional single-database approaches can limit scalability and isolation between tenants. Sharding offers a solution by partitioning data across multiple databases, thus enhancing performance, scalability, and data isolation—key components in multi-tenant architectures. This library aims to simplify the integration of sharding into NestJS applications, making it easier to manage large-scale, multi-tenant data models.

## Acknowledgments
This project is a fork of [kibae/typeorm-sharding-repository](https://github.com/kibae/typeorm-sharding-repository), originally developed by Kibae Shin. Significant enhancements and adaptations have been made to support list based sharding and integrate this solution seamlessly with NestJS, focusing on transparency and ease of use in multi-tenant environments.

[![Node.js CI](https://github.com/rungwe/nestjs-typeorm-sharding-repository/actions/workflows/node.js.yml/badge.svg)](https://github.com/rungwe/nestjs-typeorm-sharding-repository/actions/workflows/node.js.yml)
[![NPM Version](https://badge.fury.io/js/nest-typeorm-sharding-repository.svg)](https://www.npmjs.com/package/typeorm-sharding-repository)
[![License](https://img.shields.io/github/license/kibae/typeorm-sharding-repository)](https://github.com/rungwe/nestjs-typeorm-sharding-repository/blob/main/LICENSE)

## Install
- NPM
```shell
$ npm install nest-typeorm-sharding-repository --save
```

- Yarn
```shell
$ yarn add nest-typeorm-sharding-repository
```

----

## Usage
### 1. Module Registration
- Instead of setting the TypeORM, set the ShardingManager. Most of the settings are similar to TypeORM.
- In this example, the User entity has a key of number type. It is recommended to set the ShardingManager according to the rules of a compatible key or range of keys.
```typescript
import { Module } from '@nestjs/common';
import { User } from '../entity/user';
import { ShardingType } from 'nest-typeorm-sharding-repository';
import { ShardingModule } from 'nest-typeorm-sharding-repository';

@Module({
  imports: [
    ShardingModule.forRoot({
      shardingType: ShardingType.LIST,
      type: 'sqlite',
      synchronize: true,
      logging: 'all',
      entities: [User],
      shards: [
        {...dbConf, database: ':memory:', key: 'default', default: true },
        {...dbConf, database: ':memory:', key: 'partner1' },
        {...dbConf, database: ':memory:', key: 'partner2' },
        {...dbConf, database: ':memory:', key: 'partner3' }
        /**
         * For Range based sharding
         * {...dbConf, database: ':memory:', minKey: 0, maxKey: 10000 }
         * */      
      ],
    }),
    ShardingModule.forFeature([User])
  ],
})
export class AppModule {}

```

### 2. Define Sharded Entities
1. Use **@ShardingEntity** instead of **@Entity** decorator.
2. Inherit **ShardingBaseEntity** instead of **BaseEntity**.
- New data will be inserted into the added database shard.
```typescript
import { Column, Index, PrimaryGeneratedColumn } from 'typeorm';
import { ShardingEntity } from 'nest-typeorm-sharding-repository';
import { ShardingType } from 'nest-typeorm-sharding-repository';
import { ShardingBaseEntity } from 'nest-typeorm-sharding-repository';

@ShardingEntity<User, string>({
    /** 
     * Declare the sharding mechanism
     * RANGE and LIST based sharding are supported
     * */
    type: ShardingType.LIST,
    /** 
     *  
     * Define a boolean function that will do sharding resolution given an entity and a sharding key.
     * It will determine which shard will be picked.
     * This will be used during save operations.
     * If it doesn't resolve, the first default shard or if its not defined, the last shard will be picked.
     * NB: To process one entity, it can be called as many as the number of shards
     * */
    findShard: (entity: Case4, shardingKey: string) => !!entity.partner && shardingKey === entity.partner,
})
export class User extends ShardingBaseEntity {
    @PrimaryGeneratedColumn()
    id!: number;

    @Column()
    @Index()
    firstName!: string;

    @Column()
    lastName!: string;

    @Column()
    age!: number;

    @Column()
    partner!: string;
}

```
- For Range based sharding follow the below example
```typescript
@ShardingEntity<User, number>({
    type: ShardingType.RANGE,
    
    // Decide in which shard the entity will be processed. To process one entity, it can be called as many as the number of shards.
    // If data is being inserted, the key may be empty.
    // If false is returned in all cases, the last shard is chosen.
    // For minKey and maxKey, the values defined in ShardingManager are delivered.
    findShard: (entity: User, minKey, maxKey) => entity.id && minKey <= entity.id && entity.id < maxKey,
    
    // Similar to findShard, but an ID value is passed instead of an entity.
    // The type of ID is ambiguous. In this example, passed as number.
    // Usually, ID values referenced in repository.findByIds() etc. are passed.
    // You need to determine which shard the id resides on.
    findShardById: (id: number, minKey, maxKey) => id && minKey <= id && id < maxKey,
})
export class User extends ShardingBaseEntity {
    @PrimaryGeneratedColumn() id: number;
    @Column() firstName: string;
    @Column() lastName: string;
    @Column() age: number;
}
```

### 3. Usage in services
- `ShardingRepositoryService` compatible with TypeORM.BaseEntity and ShardingBaseEntity.
- [Repository Interface](https://github.com/rungwe/nestjs-typeorm-sharding-repository/tree/main/src/repository-service/abstract-repository-service.ts)
```typescript
import { Injectable } from '@nestjs/common';
import { InjectRepository } from 'nest-typeorm-sharding-repository';
import { User } from '../entity/user';
import { ShardingRepositoryService } from 'nest-typeorm-sharding-repository';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: ShardingRepositoryService<User>,
  ) {}


  async findAllCases(): Promise<User[]> {
    return this.userRepository.find();
  }

  async saveCase(user: User): Promise<void> {
   await this.userRepository.save(user)
  }

}

```

### 4. Entity [static] method
- [This test code will help you.](https://github.com/rungwe/nestjs-typeorm-sharding-repository/blob/main/src/test/sharding-manager.spec.ts), [(Case1 Entity)](https://github.com/rungwe/nestjs-typeorm-sharding-repository/blob/main/src/test/entity/case1.ts) 
```typescript
// Provides almost the same functionality as TypeORM BaseEntity.
const entity = await Case1.save({
    firstName: 'Typeorm',
    lastName: 'Sharding',
    age: 10,
});

await entity.save();
await entity.remove();
await entity.softRemove();
await entity.recover();
await entity.reload();

```


### 5. Writting Tests
- An example of how to write end to end tests, assuming you have set up the main AppModule.

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { AppModule } from './module/your-app-module';
import { CaseService } from './service/case-service';
import { Case4 } from './entity/case4';
import { ShardingRepositoryService } from 'nest-typeorm-sharding-repository';
import { ShardingManager } from 'nest-typeorm-sharding-repository';

describe('E2E Tests Example', () => {
  let app: INestApplication;
  let caseService: CaseService;
  let case4Repository: ShardingRepositoryService<Case4>;
  let shardingManager: ShardingManager;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
      providers: [CaseService],
    }).compile();

    app = moduleFixture.createNestApplication();
    caseService = app.get<CaseService>(CaseService);
    const repositoryToken = `ShardingRepositoryService<Case4>`; 
    case4Repository = app.get(repositoryToken);
    shardingManager = app.get(ShardingManager);

    case4Repository.delete({});
    await app.init();
  });

  beforeEach(async () => {
    await case4Repository.delete({});
  });


  it('should ensure service is defined', async () => {
    expect(caseService).toBeDefined();
  })

  it('should ensure repository is defined', () => {
    expect(case4Repository).toBeDefined();
  });

  it('should retrieve a repository service and interact with the database', async () => {
    
    const result = await caseService.findAllCases();
    expect(result).toBeDefined();

  });

  it('should save entity in the db and be able to find it', async () => {
    const case4: Case4 = new Case4()
    case4.age = 4
    case4.firstName = 'Foo';
    case4.lastName = 'Bar';
    case4.partner = 'test';

    await caseService.saveCase(case4);

    const cases = await caseService.findAllCases();
    const count = await case4Repository.count();
    expect(cases).toBeDefined();
    expect(cases.length).toBe(1);
    expect(count).toBe(1);

  })

  // Additional tests...

  afterAll(async () => {
    await app.close();
  });
});

```
----

## Contributors
<a href="https://github.com/rungwe/nestjs-typeorm-sharding-repository/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=rungwe/nestjs-typeorm-sharding-repository" />
</a>

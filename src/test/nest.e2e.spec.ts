import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { TestAppModule } from './module/test-sharding.module';
import { CaseService } from './service/case-service';
import { Case4 } from './entity/case4';
import { ShardingRepositoryService } from '../repository-service/sharding-repository-service';
import { ShardingManager } from '../sharding-manager';
import { getRepositoryToken } from '../nest/util';


describe('E2E Tests for ShardingModule', () => {
    let app: INestApplication;
    let caseService: CaseService;
    let case4Repository: ShardingRepositoryService<Case4>;
    let shardingManager: ShardingManager;


    beforeAll(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [TestAppModule],
            providers: [CaseService],
        }).compile();

        app = moduleFixture.createNestApplication();
        caseService = app.get<CaseService>(CaseService);
        const repositoryToken = getRepositoryToken(Case4);
        console.log(repositoryToken)
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

    it('should save entity in the correct shard, default shard if there is no matching shard', async () => {
        const case4: Case4 = new Case4()
        case4.id = 100
        case4.age = 4
        case4.firstName = 'Foo';
        case4.lastName = 'Bar';
        case4.partner = 'test';

        await caseService.saveCase(case4);


        expect((await shardingManager.getDataSourceByShardingKey('default').getRepository<Case4>(Case4).findOneBy({ id: case4.id }))).toBeDefined();
        expect((await shardingManager.getDataSourceByShardingKey('partner1').getRepository<Case4>(Case4).findOneBy({ id: case4.id }))).toBe(null);
        expect((await shardingManager.getDataSourceByShardingKey('partner2').getRepository<Case4>(Case4).findOneBy({ id: case4.id }))).toBe(null);
        expect((await shardingManager.getDataSourceByShardingKey('partner3').getRepository<Case4>(Case4).findOneBy({ id: case4.id }))).toBe(null);

    });

    it('should save entity in the correct shard, the matching shard', async () => {
        const matchingShardingKey = 'partner1'
        const case4: Case4 = new Case4()
        case4.id = 100
        case4.age = 4
        case4.firstName = 'Foo';
        case4.lastName = 'Bar';
        case4.partner = matchingShardingKey;

        await caseService.saveCase(case4);


        expect((await shardingManager.getDataSourceByShardingKey('default').getRepository<Case4>(Case4).findOneBy({ id: case4.id }))).toBe(null);
        expect((await shardingManager.getDataSourceByShardingKey(matchingShardingKey).getRepository<Case4>(Case4).findOneBy({ id: case4.id }))).toBeDefined();
        expect((await shardingManager.getDataSourceByShardingKey('partner2').getRepository<Case4>(Case4).findOneBy({ id: case4.id }))).toBe(null);
        expect((await shardingManager.getDataSourceByShardingKey('partner3').getRepository<Case4>(Case4).findOneBy({ id: case4.id }))).toBe(null);

    });

    // findOneByCase
    it('should save entity in the correct shard, and find the matching record in the correct shard', async () => {
        const matchingShardingKey = 'partner1'
        const case4: Case4 = new Case4()
        case4.id = 100
        case4.age = 4
        case4.firstName = 'Foo';
        case4.lastName = 'Bar';
        case4.partner = matchingShardingKey;

        await caseService.saveCase(case4);
        const resultFromShardingKey = await caseService.findOneByCase({ id: case4.id }, matchingShardingKey);
        expect(resultFromShardingKey).toBeDefined();
        const findResults = await caseService.findOneByCase({ id: case4.id });
        expect(findResults).toBeDefined();
        const partner2Result = await caseService.findOneByCase({ id: case4.id }, 'partner2');
        expect(partner2Result).toBe(null);
        const partner3Result = await caseService.findOneByCase({ id: case4.id }, 'partner3');
        expect(partner3Result).toBe(null);

    });
    // findCasesBy
    it('should save entities in the correct shard, and find by the matching records in the correct shard', async () => {
        const matchingShardingKey = 'partner1'
        const case4: Case4 = new Case4()
        case4.id = 100
        case4.age = 4
        case4.firstName = 'Foo';
        case4.lastName = 'Bar';
        case4.partner = matchingShardingKey;

        const case4Two: Case4 = new Case4()
        case4Two.id = 101
        case4Two.age = 4
        case4Two.firstName = 'Foo';
        case4Two.lastName = 'Bar';
        case4Two.partner = matchingShardingKey;

        await caseService.saveCase(case4);
        await caseService.saveCase(case4Two);
        const recordsFromShardingKey = await caseService.findCasesBy({ age: case4.age }, matchingShardingKey);
        expect(recordsFromShardingKey).toBeDefined();
        expect(recordsFromShardingKey.length).toBe(2);
        const defaultRecords = await caseService.findCasesBy({ age: case4.age }, 'default');
        const recordsNoShardingKey = await caseService.findCasesBy({ age: case4.age });
        expect(defaultRecords).toBeDefined();
        expect(defaultRecords.length).toBe(0);
        expect(recordsNoShardingKey).toBeDefined();
        expect(recordsNoShardingKey.length).toBe(2);
    });
    // findCases
    it('should save entities in the correct shard, and find the matching records in the correct shard', async () => {
        const matchingShardingKey = 'partner1'
        const case4: Case4 = new Case4()
        case4.id = 100
        case4.age = 4
        case4.firstName = 'Foo';
        case4.lastName = 'Bar';
        case4.partner = matchingShardingKey;

        const case4Two: Case4 = new Case4()
        case4Two.id = 101
        case4Two.age = 4
        case4Two.firstName = 'Foo';
        case4Two.lastName = 'Bar';
        case4Two.partner = matchingShardingKey;

        await caseService.saveCase(case4);
        await caseService.saveCase(case4Two);
        const recordsFromShardingKey = await caseService.findCases({ where: { age: case4.age } }, matchingShardingKey);
        expect(recordsFromShardingKey).toBeDefined();
        expect(recordsFromShardingKey.length).toBe(2);
        const defaultRecords = await caseService.findCases({ where: { age: case4.age } }, 'default');
        expect(defaultRecords).toBeDefined();
        expect(defaultRecords.length).toBe(0);
    });
    // countCases
    it('should save entities in the correct shard, and count the matching records in the correct shard', async () => {
        const matchingShardingKey = 'partner1'
        const case4: Case4 = new Case4()
        case4.id = 100
        case4.age = 4
        case4.firstName = 'Foo';
        case4.lastName = 'Bar';
        case4.partner = matchingShardingKey;

        const case4Two: Case4 = new Case4()
        case4Two.id = 101
        case4Two.age = 4
        case4Two.firstName = 'Foo';
        case4Two.lastName = 'Bar';
        case4Two.partner = matchingShardingKey;

        await caseService.saveCase(case4);
        await caseService.saveCase(case4Two);
        const recordsFromShardingKeyCount = await caseService.countCases({ where: { age: case4.age } }, matchingShardingKey);
        expect(recordsFromShardingKeyCount).toBe(2);
        const defaultRecordsCount = await caseService.countCases({ where: { age: case4.age } }, 'default');
        expect(defaultRecordsCount).toBe(0);
        const recordsNoShardingKeyCount = await caseService.countCases({ where: { age: case4.age } });
        expect(recordsNoShardingKeyCount).toBe(2);
    });
    // countCasesBy
    it('should save entities in the correct shard, and count the matching records in the correct shard', async () => {
        const matchingShardingKey = 'partner1'
        const case4: Case4 = new Case4()
        case4.id = 100
        case4.age = 4
        case4.firstName = 'Foo';
        case4.lastName = 'Bar';
        case4.partner = matchingShardingKey;

        const case4Two: Case4 = new Case4()
        case4Two.id = 101
        case4Two.age = 4
        case4Two.firstName = 'Foo';
        case4Two.lastName = 'Bar';
        case4Two.partner = matchingShardingKey;

        await caseService.saveCase(case4);
        await caseService.saveCase(case4Two);
        const recordsFromShardingKeyCount = await caseService.countCasesBy({ age: case4.age }, matchingShardingKey);
        expect(recordsFromShardingKeyCount).toBe(2);
        const defaultRecordsCount = await caseService.countCasesBy({ age: case4.age }, 'default');
        expect(defaultRecordsCount).toBe(0);
        const recordsNoShardingKeyCount = await caseService.countCasesBy({ age: case4.age });
        expect(recordsNoShardingKeyCount).toBe(2);
    });
    // findAndCountCases
    it('should save entities in the correct shard, and find and count the matching records in the correct shard', async () => {
        const matchingShardingKey = 'partner1'
        const case4: Case4 = new Case4()
        case4.id = 100
        case4.age = 4
        case4.firstName = 'Foo';
        case4.lastName = 'Bar';
        case4.partner = matchingShardingKey;

        const case4Two: Case4 = new Case4()
        case4Two.id = 101
        case4Two.age = 4
        case4Two.firstName = 'Foo';
        case4Two.lastName = 'Bar';
        case4Two.partner = matchingShardingKey;

        await caseService.saveCase(case4);
        await caseService.saveCase(case4Two);
        const [records, count] = await caseService.findAndCountCases({ where: { age: case4.age } }, matchingShardingKey);
        expect(records).toBeDefined();
        expect(records.length).toBe(2);
        expect(count).toBe(2);
        const [defaultRecords, defaultCount] = await caseService.findAndCountCases({ where: { age: case4.age } }, 'default');
        expect(defaultRecords).toBeDefined();
        expect(defaultRecords.length).toBe(0);
        expect(defaultCount).toBe(0);
        const [recordsNoShardingKey, noShardingKeyCount] = await caseService.findAndCountCases({ where: { age: case4.age } });
        expect(recordsNoShardingKey[0]).toBeDefined();
        expect(recordsNoShardingKey.length).toBe(2);
        expect(noShardingKeyCount).toBe(2);
    });
    // findAndCountCasesBy
    it('should save entities in the correct shard, and find and count the matching records in the correct shard', async () => {
        const matchingShardingKey = 'partner1'
        const case4: Case4 = new Case4()
        case4.id = 100
        case4.age = 4
        case4.firstName = 'Foo';
        case4.lastName = 'Bar';
        case4.partner = matchingShardingKey;

        const case4Two: Case4 = new Case4()
        case4Two.id = 101
        case4Two.age = 4
        case4Two.firstName = 'Foo';
        case4Two.lastName = 'Bar';
        case4Two.partner = matchingShardingKey;

        await caseService.saveCase(case4);
        await caseService.saveCase(case4Two);
        const [records, count] = await caseService.findAndCountCasesBy({ age: case4.age }, matchingShardingKey);
        expect(records).toBeDefined();
        expect(records.length).toBe(2);
        expect(count).toBe(2);
        const [defaultRecords, defaultCount] = await caseService.findAndCountCasesBy({ age: case4.age }, 'default');
        expect(defaultRecords).toBeDefined();
        expect(defaultRecords.length).toBe(0);
        expect(defaultCount).toBe(0);
        const [recordsNoShardingKey, noShardingKeyCount] = await caseService.findAndCountCasesBy({ age: case4.age });
        expect(recordsNoShardingKey[0]).toBeDefined();
        expect(recordsNoShardingKey.length).toBe(2);
        expect(noShardingKeyCount).toBe(2);
    });
    // updateCase
    it('should save entities in the correct shard, and update the matching records in the correct shard', async () => {
        const matchingShardingKey = 'partner1'
        const case4: Case4 = new Case4()
        case4.id = 100
        case4.age = 4
        case4.firstName = 'Foo';
        case4.lastName = 'Bar';
        case4.partner = matchingShardingKey;

        const case4Two: Case4 = new Case4()
        case4Two.id = 101
        case4Two.age = 4
        case4Two.firstName = 'Foo';
        case4Two.lastName = 'Bar';
        case4Two.partner = matchingShardingKey;

        await caseService.saveCase(case4);
        await caseService.saveCase(case4Two);
        const updateResult = await caseService.updateCase({ age: case4.age }, { age: 5 }, matchingShardingKey);
        expect(updateResult).toBeDefined();
        const updatedRecords = await caseService.findCases({ where: { age: 5 } }, matchingShardingKey);
        expect(updatedRecords).toBeDefined();
        expect(updatedRecords.length).toBe(2);
        const defaultRecords = await caseService.findCases({ where: { age: 5 }, }, 'default');
        expect(defaultRecords).toBeDefined();
        expect(defaultRecords.length).toBe(0);
    });
    // deleteCase
    it('should save entities in the correct shard, and delete the matching records in the correct shard', async () => {
        const matchingShardingKey = 'partner1'
        const case4: Case4 = new Case4()
        case4.id = 100
        case4.age = 4
        case4.firstName = 'Foo';
        case4.lastName = 'Bar';
        case4.partner = matchingShardingKey;

        const case4Two: Case4 = new Case4()
        case4Two.id = 101
        case4Two.age = 4
        case4Two.firstName = 'Foo';
        case4Two.lastName = 'Bar';
        case4Two.partner = matchingShardingKey;

        await caseService.saveCase(case4);
        await caseService.saveCase(case4Two);
        const deleteResult = await caseService.deleteCase({ age: case4.age }, matchingShardingKey);
        expect(deleteResult).toBeDefined();
        const deletedRecords = await caseService.findCases({ where: { age: case4.age } }, matchingShardingKey);
        expect(deletedRecords).toBeDefined();
        expect(deletedRecords.length).toBe(0);
        const defaultRecords = await caseService.findCases({ where: { age: case4.age } }, 'default');
        expect(defaultRecords).toBeDefined();
        expect(defaultRecords.length).toBe(0);
    });
    // findOneCase
    it('should save entities in the correct shard, and find the matching records in the correct shard', async () => {
        const matchingShardingKey = 'partner1'
        const case4: Case4 = new Case4()
        case4.id = 100
        case4.age = 4
        case4.firstName = 'Foo';
        case4.lastName = 'Bar';
        case4.partner = matchingShardingKey;

        const case4Two: Case4 = new Case4()
        case4Two.id = 101
        case4Two.age = 4
        case4Two.firstName = 'Foo';
        case4Two.lastName = 'Bar';
        case4Two.partner = matchingShardingKey;

        await caseService.saveCase(case4);
        await caseService.saveCase(case4Two);
        const resultFromShardingKey = await caseService.findOneCase({ where: { id: case4.id } }, matchingShardingKey);
        expect(resultFromShardingKey).toBeDefined();
        const findResults = await caseService.findOneCase({ where: { id: case4.id } });
        expect(findResults).toBeDefined();
        const partner2Result = await caseService.findOneCase({ where: { id: case4.id }, }, 'partner2');
        expect(partner2Result).toBe(null);
        const partner3Result = await caseService.findOneCase({ where: { id: case4.id }, }, 'partner3');
        expect(partner3Result).toBe(null);
    });
  // Additional tests...

  afterAll(async () => {
    await app.close();
  });
});

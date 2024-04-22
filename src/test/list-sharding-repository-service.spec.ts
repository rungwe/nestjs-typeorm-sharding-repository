import { ShardingManager } from '../sharding-manager';
import { ShardingType } from '../types/typeorm-sharding.type';
import { Case4 } from './entity/case4';
import { DataSource } from 'typeorm';
import { RepositoryService } from '../repository-service/repository-service';
import { Case3 } from './entity/case3';



async function getDataSource(): Promise<ShardingManager> {
    return ShardingManager.init({
        shardingType: ShardingType.LIST,
        type: 'sqlite',
        synchronize: true,
        logging: 'all',
        entities: [Case4],
        shards: [
            { database: ':memory:', key: 'default', default: true },
            { database: ':memory:', key: 'partner1' },
            { database: ':memory:', key: 'partner2' },
            { database: ':memory:', key: 'partner3' },
            //{ database: ':memory:', key: 'default', },

        ],
    });
}

let dataSource: ShardingManager;
describe('Repository Service', () => {
    beforeEach(async () => {
        dataSource = await getDataSource();
    });

    afterEach(async () => {
        if (dataSource) {
            await dataSource.destroy();
            dataSource.dataSources.forEach((dataSource) => expect(dataSource.isInitialized).toEqual(false));
        }
    });

    it("Case4 - insert into the default shard if sharding key doesn't resolve", async () => {
        const repository = RepositoryService.of(Case4);
        const partner = 'test';
        const entity = await repository
            .create({
                id: 1,
                firstName: 'Typeorm',
                lastName: 'Sharding',
                age: 10,
                partner
            })
            .save();

        expect((await repository.findByIds([1], partner)).length).toBe(1);
        expect((await repository.findByIds([1], 'default')).length).toBe(1);
        expect((await repository.findByIds([1], 'partner1')).length).toBe(0);
        expect((await repository.findByIds([1], 'partner2')).length).toBe(0);
        expect((await repository.findByIds([1], 'partner3')).length).toBe(0);


        expect((await repository.find()).length).toBe(1);
        expect(await repository.findOneBy({ firstName: 'Typeorm' })).toBeDefined();
        expect(await repository.findOneBy({ firstName: 'typeorM' })).toBeUndefined();

        expect((await repository.findOneById(1, partner))?.firstName).toBeDefined();
    });

    it('Case4 - force insert into a specific shard', async () => {
        const repository = RepositoryService.of(Case4);

        const entity = await repository
            .create({
                firstName: 'Typeorm',
                lastName: 'Sharding',
                age: 10,
                id: 12,
                partner: 'partner3'
            })
            .save();

        expect((await repository.findByIds([12], 'partner3')).length).toBe(1);
        expect((await repository.findByIds([12], 'partner1')).length).toBe(0);
        expect((await repository.findByIds([12], 'partner2')).length).toBe(0);
        expect((await repository.findByIds([12], 'default')).length).toBe(0);

        
        expect((await repository.find()).length).toBe(1);
        expect(await repository.findOneBy({ firstName: 'Typeorm' })).toBeDefined();
        expect(await repository.findOneBy({ firstName: 'typeorM' })).toBeUndefined();
    });



    it('Case4 - update', async () => {
        const repository = RepositoryService.of(Case4);

        const entity = await repository
            .create({
                firstName: 'Typeorm',
                lastName: 'Sharding',
                age: 10,
                id: 1100,
                partner: 'partner1'
            })
            .save();

        expect((await repository.findOneById(1100, 'partner1'))?.firstName).toBeDefined();
        expect((await repository.findOneBy({ firstName: 'Typeorm' }))?.firstName).toBeDefined();
        expect((await repository.findOneBy({ firstName: 'typeorM' }))?.firstName).toBeUndefined();

        entity.firstName = 'typeorM';
        await entity.save();

        expect((await repository.findOneBy({ firstName: 'Typeorm' }))?.firstName).toBeUndefined();
        expect((await repository.findOneBy({ firstName: 'typeorM' }))?.firstName).toBeDefined();
        expect((await repository.findOneById(1100, 'partner1'))?.firstName).toBe('typeorM');
    });

    it('Case4 - misc', async () => {
        const repository = RepositoryService.of(Case4);

        const entity = await repository
            .create({
                firstName: 'Typeorm',
                lastName: 'Sharding',
                age: 10,
                id: 1100,
                partner: 'partner1'
            })
            .save();

        expect((await repository.findOne({ where: { firstName: 'Typeorm' } }))?.firstName).toBeDefined();
        expect((await repository.findOne({ where: { firstName: 'typeorM' } }))?.firstName).toBeUndefined();
        expect((await repository.findOneById(1100, 'partner1'))?.firstName).toBe('Typeorm');
        expect((await repository.findByIds([1100], 'partner1'))?.length).toBeGreaterThan(0);

        const [rows, count] = await repository.findAndCount();
        expect(count).toBe(1);
        expect(rows.length).toBe(1);
        expect(rows[0].id).toBe(1100);
        expect(rows[0].firstName).toBe('Typeorm');

        expect(await repository.count()).toBe(1);
        expect((await repository.update({ id: 1100 }, { lastName: 'Bob' })).affected).toBe(1);
        expect((await repository.findOneById(1100, 'partner1'))?.lastName).toBe('Bob');
        expect((await repository.remove(entity)).id).toBeUndefined();
        expect((await repository.findOneById(1100, 'partner1'))?.lastName).toBeUndefined();
    });



    it('Case3 - TypeORM repository service', async () => {
        const typeorm = await new DataSource({
            type: 'sqlite',
            synchronize: true,
            logging: 'all',
            entities: [Case3],
            database: ':memory:',
        }).initialize();

        const repository1 = RepositoryService.of(Case4);
        const repository2 = RepositoryService.of(Case3);

        const entity1 = await repository1
            .create({
                firstName: 'Typeorm',
                lastName: 'Sharding',
                age: 10,
                id: 1100,
                partner: 'test'
            })
            .save();

        const entity2 = await repository2
            .create({
                firstName: 'Typeorm',
                lastName: 'Sharding',
                age: 10,
                id: 1100,
            })
            .save();

        expect(await repository1.count()).toBe(1);
        expect((await repository1.update({ id: 1100 }, { lastName: 'Bob' })).affected).toBe(1);
        expect((await repository1.findOneById(1100, 'test'))?.lastName).toBe('Bob');
        expect((await repository1.remove(entity1)).id).toBeUndefined();
        expect((await repository1.findOneById(1100, 'test'))?.lastName).toBeUndefined();

        expect(await repository2.count()).toBe(1);
        expect((await repository2.update({ id: 1100 }, { lastName: 'Bob' })).affected).toBe(1);
        expect((await repository2.findOneById(1100))?.lastName).toBe('Bob');
        expect((await repository2.remove(entity2)).id).toBeUndefined();
        expect((await repository2.findOneById(1100))?.lastName).toBeUndefined();
    });
});

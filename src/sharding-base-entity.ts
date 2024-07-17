import {
    DataSource,
    DeepPartial,
    DeleteResult,
    EntityManager,
    FindManyOptions,
    FindOneOptions,
    FindOptionsWhere,
    ObjectID,
    RemoveOptions,
    Repository,
    SaveOptions,
    UpdateResult,
} from 'typeorm';
import { QueryDeepPartialEntity } from 'typeorm/query-builder/QueryPartialEntity';
import { ObjectUtils } from 'typeorm/util/ObjectUtils';
import { ShardingManager } from './sharding-manager';
import { ShardingType } from './types/typeorm-sharding.type';

export class ShardingBaseEntity {
    private base(): typeof ShardingBaseEntity {
        return this.constructor as typeof ShardingBaseEntity;
    }

    async save(options?: SaveOptions): Promise<this> {
        return this.base().getManager(this).save(this, options);
    }

    async remove(options?: RemoveOptions): Promise<this> {
        return this.base().getManager(this).remove(this, options);
    }

    async softRemove(options?: SaveOptions): Promise<this> {
        return this.base().getManager(this).softRemove(this, options);
    }

    async recover(options?: SaveOptions): Promise<this> {
        return this.base().getManager(this).recover(this, options);
    }

    async reload(): Promise<void> {
        const repo = this.base().getRepository(this);
        const id = repo.metadata.getEntityIdMap(this.base());
        if (!id) throw new Error(`Entity doesn't have id-s set, cannot reload entity`);

        const reloadedEntity = await repo.findOneByOrFail(id as any);
        ObjectUtils.assign(this, reloadedEntity);
    }

    //     _______.___________.    ___   .___________. __    ______
    //     /       |           |   /   \  |           ||  |  /      |
    //    |   (----`---|  |----`  /  ^  \ `---|  |----`|  | |  ,----'
    //     \   \       |  |      /  /_\  \    |  |     |  | |  |
    // .----)   |      |  |     /  _____  \   |  |     |  | |  `----.
    // |_______/       |__|    /__/     \__\  |__|     |__|  \______|
    private static async wrapArray<T, R = T>(
        entities: DeepPartial<T> | DeepPartial<T>[],
        func: (entities: (DeepPartial<T> | T)[]) => Promise<R[]>
    ): Promise<R | R[]> {
        const isArray = Array.isArray(entities);
        entities = (isArray ? entities : [entities]) as T[];
        const result = await func(entities);
        return isArray ? result : result[0];
    }

    static save<T extends ShardingBaseEntity>(
        this: { new(): T } & typeof ShardingBaseEntity,
        entities: DeepPartial<T>[],
        options?: SaveOptions
    ): Promise<T[]>;
    static save<T extends ShardingBaseEntity>(
        this: { new(): T } & typeof ShardingBaseEntity,
        entity: DeepPartial<T>,
        options?: SaveOptions
    ): Promise<T>;

    static async save<T extends ShardingBaseEntity>(
        this: { new(): T } & typeof ShardingBaseEntity,
        entities: DeepPartial<T> | DeepPartial<T>[],
        options?: SaveOptions
    ): Promise<T | T[]> {
        return this.wrapArray<T>(entities, (list) =>
            Promise.all(
                list.map((item) => {
                    return this.getRepository(item).save(this.getRepository(item).create(item), options);
                })
            )
        );
    }

    ////
    static create<T extends ShardingBaseEntity>(this: { new(): T } & typeof ShardingBaseEntity, entityLikeArray: DeepPartial<T>[]): T[];
    static create<T extends ShardingBaseEntity>(this: { new(): T } & typeof ShardingBaseEntity, entityLike?: DeepPartial<T>): T;
    static create<T extends ShardingBaseEntity>(
        this: { new(): T } & typeof ShardingBaseEntity,
        entities?: DeepPartial<T> | DeepPartial<T>[]
    ): T | T[] {
        if (!entities) return this.getRepository({} as T).create();

        const isArray = Array.isArray(entities);
        entities = (isArray ? entities : [entities]) as T[];
        const result = entities.map((item) => this.getRepository(item).create(item));
        return isArray ? result : result[0];
    }

    ////
    static remove<T extends ShardingBaseEntity>(
        this: { new(): T } & typeof ShardingBaseEntity,
        entities: T[],
        options?: RemoveOptions
    ): Promise<T[]>;
    static remove<T extends ShardingBaseEntity>(
        this: { new(): T } & typeof ShardingBaseEntity,
        entity: T,
        options?: RemoveOptions
    ): Promise<T>;

    static remove<T extends ShardingBaseEntity>(
        this: { new(): T } & typeof ShardingBaseEntity,
        entities: T | T[],
        options?: RemoveOptions,
    ): Promise<T | T[]> {
        return this.wrapArray<T>(entities, (list) =>
            Promise.all(list.map((item: DeepPartial<T>) => this.getRepository<T>(item).remove(item as T, options)))
        );
    }

    ////
    static softRemove<T extends ShardingBaseEntity>(
        this: { new(): T } & typeof ShardingBaseEntity,
        entities: T[],
        options?: SaveOptions
    ): Promise<T[]>;
    static softRemove<T extends ShardingBaseEntity>(
        this: { new(): T } & typeof ShardingBaseEntity,
        entity: T,
        options?: SaveOptions
    ): Promise<T>;

    static softRemove<T extends ShardingBaseEntity>(
        this: { new(): T } & typeof ShardingBaseEntity,
        entities: T | T[],
        options?: SaveOptions,
        shardKey?: string
    ): Promise<T | T[]> {
        if (this.getShardingType() === ShardingType.LIST && shardKey) {
            return this.wrapArray<T>(entities, (list) =>
                Promise.all(list.map((item: DeepPartial<T>) => this.getRepository<T>(item).softRemove(item, options)))
            );
        }
        return this.wrapArray<T>(entities, (list) =>
            Promise.all(list.map((item: DeepPartial<T>) => this.getRepository<T>(item).softRemove(item, options)))
        );
    }

    ////
    static async update<T extends ShardingBaseEntity>(
        this: { new(): T } & typeof ShardingBaseEntity,
        criteria: string | string[] | number | number[] | Date | Date[] | ObjectID | ObjectID[] | FindOptionsWhere<T>,
        partialEntity: QueryDeepPartialEntity<T>,
        shardKey?: string
    ): Promise<UpdateResult> {
        if (this.getShardingType() === ShardingType.LIST && shardKey) {
            return this.getDataSourceShardingKey(shardKey).getRepository<T>(this).update(criteria as any, partialEntity);
        }
        return (
            await Promise.all(this.getAllRepository<T>().map((repo) => repo.update(criteria as any, partialEntity)))
        ).reduce<UpdateResult>(
            (accum, result) => {
                accum.raw.push(...(result.raw || []));
                accum.affected! += Number(result.affected) || 0;
                accum.generatedMaps.push(...(result.generatedMaps || []));
                return accum;
            },
            {
                raw: [],
                affected: 0,
                generatedMaps: [],
            }
        );
    }

    ////
    static async delete<T extends ShardingBaseEntity>(
        this: { new(): T } & typeof ShardingBaseEntity,
        criteria: string | string[] | number | number[] | Date | Date[] | ObjectID | ObjectID[] | FindOptionsWhere<T>,
        shardKey?: string
    ): Promise<DeleteResult> {
        if (this.getShardingType() === ShardingType.LIST && shardKey) {
            return this.getDataSourceShardingKey(shardKey).getRepository<T>(this).delete(criteria as any);
        }
        return (await Promise.all(this.getAllRepository<T>().map((repo) => repo.delete(criteria as any)))).reduce<DeleteResult>(
            (accum, result) => {
                accum.raw.push(...(result.raw || []));
                accum.affected! += Number(result.affected) || 0;
                return accum;
            },
            {
                raw: [],
                affected: 0,
            }
        );
    }

    ////
    static async count<T extends ShardingBaseEntity>(
        this: { new(): T } & typeof ShardingBaseEntity,
        options?: FindManyOptions<T>,
        shardKey?: string
    ): Promise<number> {
        if (this.getShardingType() === ShardingType.LIST && shardKey) {
            return this.getDataSourceShardingKey(shardKey).getRepository<T>(this).count(options as any);
        }
        return (await Promise.all(this.getAllRepository<T>().map((repo) => repo.count(options as any)))).reduce(
            (total, count) => total + count.valueOf(),
            0
        );
    }

    ////
    static async countBy<T extends ShardingBaseEntity>(
        this: { new(): T } & typeof ShardingBaseEntity,
        where: FindOptionsWhere<T>,
        shardKey?: string
    ): Promise<number> {
        if (this.getShardingType() === ShardingType.LIST && shardKey) {
            return this.getDataSourceShardingKey(shardKey).getRepository<T>(this).countBy(where as any);
        }
        return (await Promise.all(this.getAllRepository<T>().map((repo) => repo.countBy(where as any)))).reduce(
            (total, count) => total + count.valueOf(),
            0
        );
    }

    ////
    static async find<T extends ShardingBaseEntity>(
        this: { new(): T } & typeof ShardingBaseEntity,
        options?: FindManyOptions<T>,
        shardKey?: string
    ): Promise<T[]> {
        if (this.getShardingType() === ShardingType.LIST && shardKey) {
            return this.getDataSourceShardingKey(shardKey).getRepository<T>(this).find(options as any);
        }
        return (await Promise.all(this.getAllRepository<T>().map((repo) => repo.find(options as any)))).reduce<T[]>((accum, result) => {
            accum.push(...result);
            return accum;
        }, []);
    }

    ////
    static async findBy<T extends ShardingBaseEntity>(
        this: { new(): T } & typeof ShardingBaseEntity,
        where: FindOptionsWhere<T>,
        shardKey?: string
    ): Promise<T[]> {
        if (this.getShardingType() === ShardingType.LIST && shardKey) {
            return this.getDataSourceShardingKey(shardKey).getRepository<T>(this).findBy(where as any);
        }
        return (await Promise.all(this.getAllRepository<T>().map((repo) => repo.findBy(where as any)))).reduce<T[]>((accum, result) => {
            accum.push(...result);
            return accum;
        }, []);
    }

    ////
    static async findAndCount<T extends ShardingBaseEntity>(
        this: { new(): T } & typeof ShardingBaseEntity,
        options?: FindManyOptions<T>,
        shardKey?: string
    ): Promise<[T[], number]> {
        if (this.getShardingType() === ShardingType.LIST && shardKey) {
            return this.getDataSourceShardingKey(shardKey).getRepository<T>(this).findAndCount(options as any);
        }
        return (await Promise.all(this.getAllRepository<T>().map((repo) => repo.findAndCount(options as any)))).reduce<[T[], number]>(
            (accum, result) => {
                accum[0].push(...(result[0] || []));
                accum[1] += result[1] || 0;
                return accum;
            },
            [[], 0]
        );
    }

    ////
    static async findAndCountBy<T extends ShardingBaseEntity>(
        this: { new(): T } & typeof ShardingBaseEntity,
        where: FindOptionsWhere<T>,
        shardKey?: string
    ): Promise<[T[], number]> {
        if (this.getShardingType() === ShardingType.LIST && shardKey) {
            return this.getDataSourceShardingKey(shardKey).getRepository<T>(this).findAndCountBy(where as any);
        }
        return (await Promise.all(this.getAllRepository<T>().map((repo) => repo.findAndCountBy(where as any)))).reduce<[T[], number]>(
            (accum, result) => {
                accum[0].push(...(result[0] || []));
                accum[1] += result[1] || 0;
                return accum;
            },
            [[], 0]
        );
    }

    /**
     * 
     * @param this 
     * @param ids Entity Ids list
     * @param shardingKey Optional parameter, its required when sharding type is LIST
     * @returns 
     */
    static async findByIds<T extends ShardingBaseEntity>(this: { new(): T } & typeof ShardingBaseEntity, ids: any[], shardingKey?: string): Promise<T[]> {
        if (this.getShardingType() === ShardingType.RANGE) {
            const slices: [DataSource, any[]][] = [];
            ids.forEach((id) => {
                const dataSource = this.getDataSourceById(id);
                let found = slices.find((item) => item[0] === dataSource);
                if (!found) {
                    found = [dataSource, []];
                    slices.push(found);
                }
                found[1].push(id);
            });
            return (await Promise.all(slices.map(([dataSource, ids]) => dataSource.getRepository<T>(this).findByIds(ids)))).reduce<T[]>(
                (accum, items) => {
                    accum.push(...items);
                    return accum;
                },
                []
            );
        } else if(this.getShardingType() === ShardingType.LIST && shardingKey) {
            return this.getDataSourceShardingKey(shardingKey).getRepository<T>(this).findByIds(ids);
        } else if(this.getShardingType() === ShardingType.LIST && !shardingKey) {
            throw new Error('Sharding type LIST requires shardingKey parameter')
        }

        return []
    }

    ////
    static async findOne<T extends ShardingBaseEntity>(
        this: { new(): T } & typeof ShardingBaseEntity,
        options: FindOneOptions<T>,
        shardingKey?: string
    ): Promise<T | null | undefined> {
        if (this.getShardingType() === ShardingType.LIST && shardingKey) {
            return this.getDataSourceShardingKey(shardingKey).getRepository<T>(this).findOne(options as any);
        }
        return (await Promise.all(this.getAllRepository<T>().map((repo: Repository<T>) => repo.findOne(options as any)))).find((v) => !!v);
    }

    ////
    static async findOneBy<T extends ShardingBaseEntity>(
        this: { new(): T } & typeof ShardingBaseEntity,
        where: FindOptionsWhere<T>,
        shardingKey?: string
    ): Promise<T | null | undefined> {
        if (this.getShardingType() === ShardingType.LIST && shardingKey) {
            return this.getDataSourceShardingKey(shardingKey).getRepository<T>(this).findOneBy(where as any);
        }
        return (await Promise.all(this.getAllRepository<T>().map((repo) => repo.findOneBy(where as any)))).find((v) => !!v);
    }

    /**
     * 
     * @param this 
     * @param id entity id
     * @param shardingKey Optional parameter, its required when sharding type is LIST
     * @returns 
     */
    static findOneById<T extends ShardingBaseEntity>(
        this: { new(): T } & typeof ShardingBaseEntity,
        id: string | number | Date | ObjectID,
        shardingKey?: string
    ): Promise<T | null> {
        if (this.getShardingType() === ShardingType.RANGE) {
            return this.getDataSourceById(id).getRepository<T>(this).findOneById(id);
        }
        else if (this.getShardingType() === ShardingType.LIST && shardingKey) {
            return this.getDataSourceShardingKey(shardingKey).getRepository<T>(this).findOneById(id);
        }
        throw new Error('Unsupported Sharding Type');
    }

    /************************************************/
    private static _shardingManager: ShardingManager;
    private static shardingManager(): ShardingManager {
        if (!this._shardingManager || this._shardingManager.destroyed)
            this._shardingManager = Reflect.getMetadata('SHARDING_MANAGER', this);
        return this._shardingManager;
    }
    private static _shardingFunc: Function;
    private static shardingFunc(): Function {
        if (!this._shardingFunc) this._shardingFunc = Reflect.getMetadata('SHARDING_FUNC', this);
        return this._shardingFunc;
    }
    private static _shardingFuncById: Function;
    private static shardingFuncById(): Function {
        if (!this._shardingFuncById) this._shardingFuncById = Reflect.getMetadata('SHARDING_FUNC_BY_ID', this);
        return this._shardingFuncById;
    }

    private static _shardingType: ShardingType;
    private static getShardingType(): ShardingType {
        if (!this._shardingType) this._shardingType = Reflect.getMetadata('SHARDING_TYPE', this)
        return this._shardingType;
    }

    static getAllRepository<T extends ShardingBaseEntity = ShardingBaseEntity>(): Repository<T>[] {
        return this.getAllDataSource().map((item) => item.getRepository<T>(this as any));
    }

    static getRepository<T extends ShardingBaseEntity = ShardingBaseEntity>(entity: DeepPartial<T>): Repository<T> {
        return this.getDataSource(entity).getRepository(this as any);
    }

    static getManager<T extends ShardingBaseEntity = ShardingBaseEntity>(entity: DeepPartial<T>): EntityManager {
        return this.getDataSource(entity).manager;
    }

    static getAllDataSource<T extends ShardingBaseEntity = ShardingBaseEntity>(): DataSource[] {
        return this.shardingManager().dataSources;
    }

    static getDataSource<T extends ShardingBaseEntity = ShardingBaseEntity>(entity: DeepPartial<T>): DataSource {
        if (!entity) throw new Error(`ShardingBaseEntity: Direct DataSource access is not allowed.`);
        return this.shardingManager().getDataSource(entity, this.shardingFunc());
    }

    static getDataSourceById<T extends ShardingBaseEntity = ShardingBaseEntity>(id: unknown): DataSource {
        if (!id) throw new Error(`ShardingBaseEntity: Direct DataSource access is not allowed.`);
        return this.shardingManager().getDataSourceById(id, this.shardingFuncById());
    }

    static getDataSourceShardingKey<T extends ShardingBaseEntity = ShardingBaseEntity>(key: string): DataSource {
        if (!key) throw new Error(`ShardingBaseEntity: Direct DataSource access is not allowed.`);
        return this.shardingManager().getDataSourceByShardingKey(key);
    }
}

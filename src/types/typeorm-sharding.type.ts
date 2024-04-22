import { DataSource } from 'typeorm';
import { BaseDataSourceOptions } from 'typeorm/data-source/BaseDataSourceOptions';
import { AuroraMysqlConnectionOptions } from 'typeorm/driver/aurora-mysql/AuroraMysqlConnectionOptions';
import { AuroraPostgresConnectionOptions } from 'typeorm/driver/aurora-postgres/AuroraPostgresConnectionOptions';
import { MysqlConnectionOptions } from 'typeorm/driver/mysql/MysqlConnectionOptions';
import { OracleConnectionOptions } from 'typeorm/driver/oracle/OracleConnectionOptions';
import { PostgresConnectionOptions } from 'typeorm/driver/postgres/PostgresConnectionOptions';
import { SqliteConnectionOptions } from 'typeorm/driver/sqlite/SqliteConnectionOptions';
import { BetterSqlite3ConnectionOptions } from 'typeorm/driver/better-sqlite3/BetterSqlite3ConnectionOptions';

export interface AbstractShardingDataSource<S, T extends BaseDataSourceOptions> extends BaseDataSourceOptions {
    shards: Array<
        Omit<T, keyof BaseDataSourceOptions> & {
            onInitialize?: (dataSource: DataSource) => Promise<void>;
            default?: boolean
        } & S
    >;
}

export interface PostgresShardingDataSource<S> extends AbstractShardingDataSource<S, PostgresConnectionOptions> {
    type: 'postgres';
}

export interface AuroraPostgresShardingDataSource<S> extends AbstractShardingDataSource<S, AuroraPostgresConnectionOptions> {
    type: 'aurora-postgres';
}

export interface MysqlShardingDataSource<S> extends AbstractShardingDataSource<S, MysqlConnectionOptions> {
    type: 'mysql' | 'mariadb';
}

export interface AuroraMysqlShardingDataSource<S> extends AbstractShardingDataSource<S, AuroraMysqlConnectionOptions> {
    type: 'aurora-mysql';
}

export interface OracleShardingDataSource<S> extends AbstractShardingDataSource<S, OracleConnectionOptions> {
    type: 'oracle';
}

export interface SqliteShardingDataSource<S> extends AbstractShardingDataSource<S, SqliteConnectionOptions> {
    type: 'sqlite';
}

export interface BetterSqlite3ShardingDataSource<S> extends AbstractShardingDataSource<S, BetterSqlite3ConnectionOptions> {
    type: 'better-sqlite3';
}

// ... "cockroachdb" | "sap" | "cordova" | "react-native" | "nativescript" | "sqljs" | "mssql" | "mongodb" | "expo" | "capacitor" | "spanner"

export type AbstractShardingDataSourceOptions<S = {}> =
    | PostgresShardingDataSource<S>
    | AuroraPostgresShardingDataSource<S>
    | MysqlShardingDataSource<S>
    | AuroraMysqlShardingDataSource<S>
    | OracleShardingDataSource<S>
    | SqliteShardingDataSource<S>
    | BetterSqlite3ShardingDataSource<S>;

export enum ShardingType {
    RANGE = 'RANGE',
    // MODULAR = 'MODULAR',
    LIST = 'LIST'
}

export type DefaultShardingKeyType = number | string;

//.______          ___      .__   __.   _______  _______
// |   _  \        /   \     |  \ |  |  /  _____||   ____|
// |  |_)  |      /  ^  \    |   \|  | |  |  __  |  |__
// |      /      /  /_\  \   |  . `  | |  | |_ | |   __|
// |  |\  \----./  _____  \  |  |\   | |  |__| | |  |____
// | _| `._____/__/     \__\ |__| \__|  \______| |_______|
export interface RangeShardingRule<T> {
    /**
     * greater or equals
     */
    minKey: T;

    /**
     * lesser
     */
    maxKey: T;
}

export type RangeShardingDataSourceOptions<T = DefaultShardingKeyType> = AbstractShardingDataSourceOptions<RangeShardingRule<T>> & {
    shardingType: ShardingType.RANGE;
};


// .__        __       _______ ____________ 
// | |      |  |     /       | |          | 
// | |      |  |    |   (----` |___|  |___| 
// | |      |  |     \   \         |  |      
// | |____  |  | .----)   |        |  |    
// |______| |__| |_______/         |__|    

export interface ListShardingRule<T> {
    key: T;
}

export type ListShardingDataSourceOptions<T = DefaultShardingKeyType> = AbstractShardingDataSourceOptions<ListShardingRule<T>> & {
    shardingType: ShardingType.LIST;
};



/*
export type ModularShardingDataSourceOptions<T = DefaultShardingKeyType> = AbstractShardingDataSourceOptions & {
    shardingType: ShardingType.MODULAR;
};

export type ShardingDataSourceOptions = RangeShardingDataSourceOptions | ModularShardingDataSourceOptions;
 */
export type ShardingDataSourceOptions = RangeShardingDataSourceOptions | ListShardingDataSourceOptions;

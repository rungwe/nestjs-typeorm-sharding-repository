import { Injectable } from '@nestjs/common';
import { InjectRepository } from '../../nest/decorators';
import { Case4 } from '../entity/case4';
import { ShardingRepositoryService } from '../../repository-service/sharding-repository-service';
import { DeleteResult, FindManyOptions, FindOneOptions, FindOptionsWhere, ObjectID, UpdateResult } from 'typeorm';

@Injectable()
export class CaseService {
  constructor(
    @InjectRepository(Case4)
    private readonly caseRepository: ShardingRepositoryService<Case4>,
  ) {}


  async findAllCases(shardingKey?:string): Promise<Case4[]> {
    return this.caseRepository.find({}, shardingKey);
  }

  async saveCase(case4: Case4): Promise<void> {
   await this.caseRepository.save(case4)
  }

  async updateCase(criteria: string | string[] | number | number[] | Date | Date[] | ObjectID | ObjectID[] | FindOptionsWhere<Case4>, partialEntity: any, shardingKey?: string): Promise<UpdateResult> {
      return await this.caseRepository.update(criteria, partialEntity, shardingKey);
  }

  async deleteCase(criteria: string | string[] | number | number[] | Date | Date[] | ObjectID | ObjectID[] | FindOptionsWhere<Case4>, shardingKey?: string): Promise<DeleteResult> {
      return await this.caseRepository.delete(criteria, shardingKey);
  }

  async findOneCase(options: FindOneOptions<Case4>, shardingKey?: string): Promise<Case4 | null | undefined> {
      return this.caseRepository.findOne(options, shardingKey);
  }

  async findOneByCase(where: FindOptionsWhere<Case4>, shardingKey?: string): Promise<Case4 | null | undefined> {
    return this.caseRepository.findOneBy(where, shardingKey);
  }

  async findCasesBy(where: FindOptionsWhere<Case4>, shardingKey?: string): Promise<Case4[]> {
    return this.caseRepository.findBy(where, shardingKey);
  }

  async findCases(options: FindManyOptions<Case4>, shardingKey?: string): Promise<Case4[]> {
    return this.caseRepository.find(options, shardingKey);
  }

  async countCasesBy(where: FindOptionsWhere<Case4>, shardingKey?: string): Promise<number> {
      return this.caseRepository.countBy(where, shardingKey);
  }

  async countCases(options?: FindManyOptions<Case4>, shardingKey?: string): Promise<number> {
      return this.caseRepository.count(options, shardingKey);
  }

  async findAndCountCasesBy(where: FindOptionsWhere<Case4>, shardingKey?: string): Promise<[Case4[], number]> {
      return this.caseRepository.findAndCountBy(where, shardingKey);
  }

  async findAndCountCases(options?: FindManyOptions<Case4>, shardingKey?: string): Promise<[Case4[], number]> {
    return this.caseRepository.findAndCount(options, shardingKey);
  }

}

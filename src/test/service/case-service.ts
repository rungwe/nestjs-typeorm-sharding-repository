import { Injectable } from '@nestjs/common';
import { InjectRepository } from '../../nest/decorators';
import { Case4 } from '../entity/case4';
import { ShardingRepositoryService } from '../../repository-service/sharding-repository-service';

@Injectable()
export class CaseService {
  constructor(
    @InjectRepository(Case4)
    private readonly caseRepository: ShardingRepositoryService<Case4>,
  ) {}


  async findAllCases(): Promise<Case4[]> {
    return this.caseRepository.find();
  }

  async saveCase(case4: Case4): Promise<void> {
   await this.caseRepository.save(case4)
  }

}

import { GraphDelta, ICommitService, IGraphState } from './GraphInterfaces';

export class CommitService implements ICommitService {
  constructor(private state: IGraphState) {}

  commit(delta: GraphDelta): void {
    this.state.applyDelta(delta);
  }
}

export default CommitService;

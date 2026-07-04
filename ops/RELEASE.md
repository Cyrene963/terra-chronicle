# Terra Chronicle Release Discipline

## Canonical Source
- **唯一权威代码源**: `/root/terra-chronicle-game`
- `/var/www/terra-pixijs` 只允许作为：
  - deploy 产物目录，或
  - 事故取证 / archive 目录
- 禁止直接手改 `/var/www/terra-pixijs`

## Public Runtime
- 当前真实公网入口：`http://165.232.142.30:8867`
- `terra.bz9.me` 当前不可作为生产入口文档依据（域名状态与实际 serving 拓扑不可靠）

## Release Rules
1. 不允许从 dirty working tree 部署
2. 不允许本地 ahead 未 push 时部署
3. 部署前必须自动快照 repo/live/pm2/logs
4. 部署只能通过 `ops/deploy.sh`
5. 部署后必须跑 verify，并生成 release manifest
6. 未做视觉/玩法 verify 不得视为正式版本

## Required Evidence Per Release
- git SHA
- source path
- target path
- snapshot path
- verify result
- key file hashes
- mounted script graph
- operator + timestamp

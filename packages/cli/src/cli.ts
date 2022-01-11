import { server } from './server'
import { cac } from 'cac'
import pkg from '../package.json'

interface Options {
  port?: number
  hostname?: string
}

const cli = cac('lan')

cli
  .command('[path]')
  .option('--port <port>', '[number] specify port')
  .option('--host <hostname>', '[string] specify hostname')
  .action(async (path: string, options: Options) => {
    await server.serveDir(
      path ?? process.cwd(),
      options.port ?? 9850,
      options.hostname ?? '0.0.0.0'
    )
  })

cli.help()
cli.version(pkg.version)
cli.parse()

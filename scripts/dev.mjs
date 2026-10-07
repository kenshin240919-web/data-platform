import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';
if(existsSync('.env'))process.loadEnvFile('.env');
const python = process.env.GUIDEJUNG_PYTHON || (existsSync('.venv/Scripts/python.exe') ? path.resolve('.venv/Scripts/python.exe') : existsSync('.venv/bin/python') ? path.resolve('.venv/bin/python') : 'python');
const processes = [
  spawn(python, ['-m','uvicorn','app.main:app','--host','127.0.0.1','--port','8100'], {cwd:'services/api',stdio:'inherit'}),
  spawn(process.execPath,['node_modules/next/dist/bin/next','dev','apps/trip','--hostname','127.0.0.1','--port','3101'],{stdio:'inherit'})
];
function stop(){for(const p of processes)p.kill();}
process.on('SIGINT',stop);process.on('SIGTERM',stop);
for(const p of processes){p.on('error',e=>{console.error(e.message);stop();process.exitCode=1;});p.on('exit',code=>{if(code){stop();process.exitCode=code;}});}

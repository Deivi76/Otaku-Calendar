import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  return handleRequest(request);
}

export async function POST(request: NextRequest) {
  return handleRequest(request);
}

async function handleRequest(request: NextRequest) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] 🔄 Crawl request received`);

  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret) {
    const token = authHeader?.replace('Bearer ', '');
    if (token !== cronSecret) {
      console.log(`[${timestamp}] ❌ Unauthorized access attempt`);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  try {
    console.log(`[${timestamp}] 🚀 Starting crawler via subprocess...`);
    
    const { spawn } = await import('child_process');
    
    return new Promise<NextResponse>((resolve) => {
      const crawlerProcess = spawn('node', ['apps/crawler/src/index.ts'], {
        cwd: process.cwd(),
        stdio: ['ignore', 'pipe', 'pipe'],
      });
      
      let stdout = '';
      let stderr = '';
      
      crawlerProcess.stdout?.on('data', (data) => {
        stdout += data.toString();
      });
      
      crawlerProcess.stderr?.on('data', (data) => {
        stderr += data.toString();
      });
      
      crawlerProcess.on('close', (code) => {
        console.log(`[${timestamp}] 📝 Crawler output:`, stdout);
        
        if (code !== 0 && stderr) {
          console.error(`[${timestamp}] ❌ Crawler error:`, stderr);
          resolve(NextResponse.json({
            success: false,
            timestamp,
            error: stderr.substring(0, 500)
          }, { status: 500 }));
          return;
        }
        
        const eventsMatch = stdout.match(/Final: (\d+) unique events/);
        const eventsCount = eventsMatch ? parseInt(eventsMatch[1]) : 0;
        
        console.log(`[${timestamp}] ✅ Crawl completed: ${eventsCount} events`);
        
        resolve(NextResponse.json({
          success: true,
          timestamp,
          eventsCount,
          message: `Successfully crawled ${eventsCount} events`
        }));
      });
      
      crawlerProcess.on('error', (err) => {
        console.error(`[${timestamp}] ❌ Crawler spawn error:`, err);
        resolve(NextResponse.json({
          success: false,
          timestamp,
          error: err.message
        }, { status: 500 }));
      });
    });
  } catch (error) {
    console.error(`[${timestamp}] ❌ Crawl failed:`, error);
    
    return NextResponse.json({
      success: false,
      timestamp,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

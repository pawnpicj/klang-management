"use client";
export default function GlobalError({ reset }: { reset: () => void }) {
  return (
    <html lang="th">
      <body>
        <main>
          <h1>เกิดข้อผิดพลาด</h1>
          <button onClick={reset}>ลองอีกครั้ง</button>
        </main>
      </body>
    </html>
  );
}

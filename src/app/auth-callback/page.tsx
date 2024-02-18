'use client'

// Sync logged in user and make sure they're in database

import { useRouter, useSearchParams } from "next/navigation";
import React, { useEffect } from "react";
import { trpc } from "../_trpc/client";
import { Loader2 } from "lucide-react";

function Page() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const origin = searchParams.get("origin");

  const { data, isLoading } = trpc.authCallback.useQuery(undefined);

  useEffect(() => {
    if (!isLoading && data) {
      // User synced
      router.push(origin ? `/${origin}` : "/dashboard");
    }
    
    router.push('/sign-in')
  }, [data, isLoading, origin, router]);

  return (
    <div className='w-full mt-24 flex justify-center'>
      <div className='flex flex-col items-center gap-2'>
        <Loader2 className='h-8 w-8 animate-spin text-zinc-800' />
        <h3 className='font-semibold text-xl'>
          Setting up your account...
        </h3>
        <p>You will be redirected automatically.</p>
      </div>
    </div>
  )
}


export default Page
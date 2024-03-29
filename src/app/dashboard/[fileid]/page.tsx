import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server"
import { notFound, redirect } from "next/navigation"
import { db } from "@/db"
import PdfRenderer from "@/components/PdfRenderer"
import ChatWrapper from "@/components/chat/ChatWrapper"

interface PageProps {
    params: {
        fileid: string  // same as folder name
    }
}

const Page = async ({ params }: PageProps) => {
    // retrieve file id - passed into page params
    const { fileid } = params
    console.log('Line 16. dashboard/[fileid]/page.tsx------------------------')
    console.log(fileid)


    // make database call
    //  1.  Make sure user is loggedin - if not, send to auth-callback
    const { getUser } = getKindeServerSession()
    const user: any = await getUser()

    if(!user || !user.id) redirect(`/auth-callback?origin=dashboard/${fileid}`)

    // 2. Get file
    const file = await db.file.findFirst({
        where: {
            id: fileid,
            userId: user.id,
        }
    })

    console.log('dashboard/[fileid]/page.tsx-------------------------')
    console.log(file)

    if(!file) notFound()

  return (
    <div className='flex-1 justify-between flex flex-col h-[calc(100vh-3.5rem)]'>
        <div className="mx-auto w-full max-w-8xl grow lg:flex xl:px-2">
            {/**left side*/}
            <div className="flex-1 xl:flex">
                <div className="px-4 py-6 sm:px-6 lg:pl-8 xl:flex-1 xl:pl-6">
                    <PdfRenderer url={file.url} />
                </div>
            </div>

            <div className='shrink-0 flex-[0.75] border-t border-gray-200 lg:w-96 lg:border-1 lg:border-t-0'>
                    <ChatWrapper fileId={file.id} />
            </div>             
        </div>
    </div>
  )
}

export default Page
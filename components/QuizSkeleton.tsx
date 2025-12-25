import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardHeader, CardFooter } from "@/components/ui/card"

export function QuizSkeleton() {
    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            {/* Header Skeleton */}
            <header className="bg-white border-b border-gray-200 px-6 py-4 shadow-sm">
                <div className="max-w-7xl mx-auto">
                    <div className="flex justify-between items-center gap-4 mb-3">
                        <div className="space-y-2">
                            <Skeleton className="h-6 w-48" />
                            <Skeleton className="h-4 w-32" />
                        </div>
                        <div className="flex gap-3">
                            <Skeleton className="h-9 w-24 rounded-lg" />
                            <Skeleton className="h-9 w-24 rounded-lg" />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <div className="flex justify-between">
                            <Skeleton className="h-3 w-20" />
                            <Skeleton className="h-3 w-20" />
                        </div>
                        <Skeleton className="h-3 w-full rounded-full" />
                    </div>
                </div>
            </header>

            {/* Main Content Skeleton */}
            <main className="flex-1 container max-w-6xl mx-auto p-6">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Question Card Skeleton */}
                    <div className="lg:col-span-2">
                        <Card className="shadow-sm">
                            <CardHeader className="border-b bg-gray-50/50">
                                <div className="flex justify-between mb-4">
                                    <Skeleton className="h-6 w-24 rounded-full" />
                                    <Skeleton className="h-6 w-32 rounded-full" />
                                </div>
                                <Skeleton className="h-8 w-3/4" />
                                <Skeleton className="h-8 w-1/2 mt-2" />
                            </CardHeader>
                            <CardContent className="p-6 space-y-4">
                                {Array(4).fill(0).map((_, i) => (
                                    <div key={i} className="h-14 w-full rounded-lg border border-gray-100 bg-white p-4 flex items-center gap-3">
                                        <Skeleton className="h-5 w-5 rounded-full" />
                                        <Skeleton className="h-4 w-full" />
                                    </div>
                                ))}
                            </CardContent>
                            <CardFooter className="flex justify-between pt-6 border-t bg-gray-50/30">
                                <Skeleton className="h-10 w-32" />
                                <Skeleton className="h-10 w-32" />
                            </CardFooter>
                        </Card>
                    </div>

                    {/* Navigation Grid Skeleton */}
                    <div className="lg:col-span-1">
                        <Card className="shadow-sm">
                            <CardHeader className="border-b bg-gray-50/50">
                                <Skeleton className="h-5 w-32" />
                                <Skeleton className="h-3 w-48 mt-2" />
                            </CardHeader>
                            <CardContent className="p-4">
                                <div className="grid grid-cols-5 gap-2">
                                    {Array(20).fill(0).map((_, i) => (
                                        <Skeleton key={i} className="h-12 w-full rounded-md" />
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </main>
        </div>
    )
}

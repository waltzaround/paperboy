export function LawList() {
  return (
    <>
<section className="p-4 border-y">
    <h1 className="font-semibold text-lg">
    News</h1>

    <h2>Legislative updates for the week of {new Date().toLocaleDateString("en-NZ", { day: "numeric", month: "long", year: "numeric" })}</h2>
</section>
    <section className="p-4  max-w-4xl mx-auto">
        <h2>Recently Passed</h2>
                <div className="grid   gap-12 pt-12 w-full">
                    <article className="p-4 border pb-6"><div className="flex justify-between"><h3 className="text-lg mb-2 font-semibold ">Bill 239—1</h3><div className="text-sm border px-2 py-1 ">           In Progress</div></div>
                    <p className="text-sm">Armed Forces Discipline Legislation Amendment Bill</p>
                    <p className="text-sm text-gray-500">
                  Hon Judith Collins, National Party</p>
                    <p className="text-xs pt-4 mt-4 border-t">
                    Updates military law to match civilian courts and creates a faster system for minor discipline. Serious crimes move from military leaders to independent prosecutors.
         
                    </p>
                    </article>
                     <article className="p-4 border pb-6"><div className="flex justify-between"><h3 className="text-lg mb-2 font-semibold ">Bill 239—1</h3><div className="text-sm border px-2 py-1 ">           In Progress</div></div>
                    <p className="text-sm">Armed Forces Discipline Legislation Amendment Bill</p>
                    <p className="text-sm text-gray-500">
                  Hon Judith Collins, National Party</p>
                    <p className="text-xs pt-4 mt-4 border-t">
                    Updates military law to match civilian courts and creates a faster system for minor discipline. Serious crimes move from military leaders to independent prosecutors.
         
                    </p>
                    </article>
                </div>

    </section>


      <footer className="p-4 py-24">
        {" "}
        <p className="text-center">
          {" "}
          Made by{" "}
          <a
            href="https://walt.online"
            className="text-blue-400 hover:text-blue-300 underline"
          >
            Walter Lim
          </a>{" "}
          and{" "}
          <a
            href="https://www.linkedin.com/in/jonas-kuhn-99526350/"
            className="text-blue-400 hover:text-blue-300 underline"
          >
            {" "}
            Jonas Kuhn
          </a>
        </p>
      </footer>
    </>
  );
}

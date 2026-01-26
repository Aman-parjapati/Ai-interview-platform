"use client";

import React, { useState } from "react";
import { BriefcaseIcon } from "lucide-react";

type JobItem = {
  title: string;
  companyName: string;
  location: string;
  description: string;
  url: string;
};

const Loader = () => (
  <div className="flex justify-center items-center py-10">
    <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
  </div>
);

function JobsPage() {
  const [position, setPosition] = useState("");
  const [country, setCountry] = useState("PK"); // set default to "PK"
  const [location, setLocation] = useState("");
  const [jobs, setJobs] = useState<JobItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchJobs = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setJobs([]);

    try {
      const query = new URLSearchParams({ position, country, location });
      const res = await fetch(`https://scrappingserver.vercel.app/api/jobs?${query.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch jobs");
      const data = await res.json();
      setJobs(data);
    } catch (err: any) {
      setError(err.message || "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="p-6 sm:p-10 max-w-7xl mx-auto">
      <div className="mb-6">
        <div className="flex items-center space-x-3 mb-2">
          <BriefcaseIcon className="text-blue-600" size={28} />
          <h2 className="text-3xl font-bold text-gray-800">Job Finder</h2>
        </div>
        <p className="text-gray-500 text-sm">Search and explore job opportunities around you.</p>
      </div>

      <form onSubmit={fetchJobs} className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <input
          type="text"
          value={position}
          onChange={(e) => setPosition(e.target.value)}
          className="w-full border border-gray-300 rounded px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Enter job title (e.g. Web Developer)"
          required
        />
        <input
          type="text"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          className="w-full border border-gray-300 rounded px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="City or Location (e.g. Karachi)"
          required
        />
        <input
          type="text"
          value={country}
          disabled
          className="w-full border border-gray-300 rounded px-4 py-2 bg-gray-100 text-gray-600 cursor-not-allowed"
          placeholder="Country Code (PK)"
          maxLength={2}
        />
        <div className="sm:col-span-3">
          <button
            type="submit"
            disabled={loading}
            className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-6 rounded transition disabled:opacity-50"
          >
            Search Jobs
          </button>
        </div>
      </form>

      {loading && <Loader />}

      {error && <p className="text-red-600 mb-4">Error: {error}</p>}

      {!loading && jobs.length === 0 && !error && (
        <p className="text-gray-600">No jobs to show. Try searching above.</p>
      )}

      {jobs.length > 0 && (
        <div className="overflow-auto rounded-lg shadow-sm border border-gray-200">
          <table className="min-w-full text-sm text-left text-gray-800">
            <thead className="bg-gray-100 text-xs uppercase">
              <tr>
                <th className="px-6 py-3">Title</th>
                <th className="px-6 py-3">Company</th>
                <th className="px-6 py-3">Location</th>
                <th className="px-6 py-3">Description</th>
                <th className="px-6 py-3">Link</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {jobs.map((job, index) => (
                <tr key={index}>
                  <td className="px-6 py-4 font-medium">{job.title}</td>
                  <td className="px-6 py-4">{job.companyName}</td>
                  <td className="px-6 py-4">{job.location}</td>
                  <td className="px-6 py-4 max-w-xs truncate">{job.description}</td>
                  <td className="px-6 py-4">
                    <a
                      href={job.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline"
                    >
                      View Job
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}

export default JobsPage;

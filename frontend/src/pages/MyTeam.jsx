import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

function MyTeam() {
  const navigate = useNavigate();

  const [team, setTeam] = useState(null);
  const [students, setStudents] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const token = localStorage.getItem("access_token");
  const currentStudentId = Number(
    localStorage.getItem("student_id")
  );

  useEffect(() => {
    if (!token) {
      navigate("/login");
      return;
    }

    fetchMyTeam();
    fetchStudents();
  }, []);

  const fetchMyTeam = async () => {
    try {
      const response = await fetch(
        "http://127.0.0.1:8000/my-team",
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to load team");
      }

      const data = await response.json();

      setTeam(data);
    } catch (error) {
      console.error(error);
      setMessage("Could not load your team.");
    } finally {
      setLoading(false);
    }
  };

  const fetchStudents = async () => {
    try {
      const response = await fetch(
        "http://127.0.0.1:8000/students"
      );

      if (!response.ok) {
        throw new Error("Failed to load students");
      }

      const data = await response.json();

      setStudents(data);
    } catch (error) {
      console.error(error);
    }
  };

  const addMember = async (studentId) => {
  setMessage("");

  try {
    const response = await fetch(
      `http://127.0.0.1:8000/teams/${team.id}/members/${studentId}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    const data = await response.json();

    if (!response.ok) {
      setMessage(data.detail || "Could not add student.");
      return;
    }

    const addedStudent = students.find(
      (student) => Number(student.id) === Number(studentId)
    );

    if (!addedStudent) {
      return;
    }

    setTeam((previousTeam) => ({
      ...previousTeam,
      members: [
        ...previousTeam.members,
        addedStudent,
      ],
      spots_available: data.spots_available,
    }));

    setMessage("Student added successfully.");
  } catch (error) {
    console.error(error);
    setMessage("Something went wrong.");
  }
};

 const removeMember = async (studentId) => {
  setMessage("");

  try {
    const response = await fetch(
      `http://127.0.0.1:8000/teams/${team.id}/members/${studentId}`,
      {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    const data = await response.json();

    if (!response.ok) {
      setMessage(data.detail || "Could not remove student.");
      return;
    }

    // Update the UI immediately
    setTeam((previousTeam) => {
      if (!previousTeam) {
        return previousTeam;
      }

      return {
        ...previousTeam,
        members: previousTeam.members.filter(
          (member) => Number(member.id) !== Number(studentId)
        ),
        spots_available: data.spots_available,
      };
    });

    setMessage("Student removed from team.");
  } catch (error) {
    console.error(error);
    setMessage("Something went wrong.");
  }
};

  if (loading) {
    return (
      <main className="max-w-6xl mx-auto px-4 py-10">
        <p>Loading...</p>
      </main>
    );
  }

  if (!team) {
    return (
      <main className="max-w-6xl mx-auto px-4 py-10">
        <div className="max-w-xl">
          <h1 className="text-3xl font-bold mb-3">
            You are not in a team yet
          </h1>

          <p className="text-gray-600 mb-6">
            Create a team or explore existing teams.
          </p>

          <div className="flex gap-3">
            <Link
              to="/teams/create"
              className="bg-black text-white px-5 py-3 rounded-lg"
            >
              Create Team
            </Link>

            <Link
              to="/teams"
              className="border px-5 py-3 rounded-lg"
            >
              Explore Teams
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const isOwner =
    Number(team.created_by) === currentStudentId;

  const memberIds = team.members.map((member) =>
    Number(member.id)
  );

  const filteredStudents = students.filter(
    (student) => {
      const text = `
        ${student.name}
        ${student.program}
        ${student.skills || ""}
        ${student.interests || ""}
      `.toLowerCase();

      return (
        text.includes(search.toLowerCase()) &&
        !memberIds.includes(Number(student.id)) &&
        Number(student.id) !== currentStudentId
      );
    }
  );

  return (
    <main className="max-w-6xl mx-auto px-4 py-8 pb-24">
      {/* Header */}

      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between mb-8">
        <div>
          <p className="text-sm text-gray-500 mb-1">
            My Team
          </p>

          <h1 className="text-3xl font-bold">
            {team.name}
          </h1>

          {team.project_title && (
            <p className="text-gray-600 mt-2">
              {team.project_title}
            </p>
          )}
        </div>

        <Link
          to={`/teams/${team.id}`}
          className="border px-4 py-2 rounded-lg text-center"
        >
          View Public Profile
        </Link>
      </div>

      {/* Message */}

      {message && (
        <div className="mb-6 bg-gray-100 border rounded-lg px-4 py-3">
          {message}
        </div>
      )}

      {/* Team Information */}

      <section className="border rounded-xl p-5 mb-8">
        <h2 className="text-xl font-semibold mb-4">
          Team Information
        </h2>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-sm text-gray-500">
              Department
            </p>

            <p className="font-medium">
              {team.department_preference}
            </p>
          </div>

          <div>
            <p className="text-sm text-gray-500">
              Available Spots
            </p>

            <p className="font-medium">
              {team.spots_available}
            </p>
          </div>

          <div>
            <p className="text-sm text-gray-500">
              Members
            </p>

            <p className="font-medium">
              {team.members.length}
            </p>
          </div>

          <div>
            <p className="text-sm text-gray-500">
              Owner
            </p>

            <p className="font-medium">
              {team.members.find(
                (member) =>
                  Number(member.id) ===
                  Number(team.created_by)
              )?.name || "You"}
            </p>
          </div>
        </div>
      </section>

      {/* Team Members */}

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4">
          Team Members
        </h2>

        <div className="grid gap-3">
          {team.members.map((member) => (
            <div
              key={member.id}
              className="border rounded-xl p-4 flex items-center justify-between gap-4"
            >
              <div>
                <Link
                  to={`/students/${member.id}`}
                  className="font-semibold hover:underline"
                >
                  {member.name}
                </Link>

                <p className="text-sm text-gray-500">
                  {member.program}
                </p>
              </div>

              {isOwner &&
                Number(member.id) !==
                  Number(team.created_by) && (
                  <button
                    onClick={() =>
                      removeMember(member.id)
                    }
                    className="text-sm border border-red-300 text-red-600 px-3 py-2 rounded-lg"
                  >
                    Remove
                  </button>
                )}

              {Number(member.id) ===
                Number(team.created_by) && (
                <span className="text-sm text-gray-500">
                  Owner
                </span>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Add Members */}

      {isOwner && (
        <section className="border rounded-xl p-5">
          <h2 className="text-xl font-semibold mb-2">
            Add Team Members
          </h2>

          <p className="text-sm text-gray-500 mb-4">
            Search students and add them to your team.
          </p>

          {team.spots_available <= 0 ? (
            <div className="bg-gray-100 rounded-lg p-4">
              Your team is currently full.
            </div>
          ) : (
            <>
              <input
                type="text"
                placeholder="Search by name, program, skills..."
                value={search}
                onChange={(e) =>
                  setSearch(e.target.value)
                }
                className="w-full border rounded-lg px-4 py-3 mb-4"
              />

              <div className="grid gap-3">
                {filteredStudents
                  .slice(0, 10)
                  .map((student) => (
                    <div
                      key={student.id}
                      className="border rounded-xl p-4 flex items-center justify-between gap-4"
                    >
                      <div className="min-w-0">
                        <Link
                          to={`/students/${student.id}`}
                          className="font-semibold hover:underline"
                        >
                          {student.name}
                        </Link>

                        <p className="text-sm text-gray-500">
                          {student.program}
                        </p>

                        {student.skills && (
                          <p className="text-sm text-gray-600 mt-1 truncate">
                            {student.skills}
                          </p>
                        )}
                      </div>

                      <button
                        onClick={() =>
                          addMember(student.id)
                        }
                        className="bg-black text-white px-4 py-2 rounded-lg text-sm shrink-0"
                      >
                        Add
                      </button>
                    </div>
                  ))}

                {filteredStudents.length === 0 && (
                  <p className="text-gray-500">
                    No available students found.
                  </p>
                )}
              </div>
            </>
          )}
        </section>
      )}
    </main>
  );
}

export default MyTeam;
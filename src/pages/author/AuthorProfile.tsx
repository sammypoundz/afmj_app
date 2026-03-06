const AuthorProfile = () => {
  return (
    <div>
      <h2>My Profile</h2>

      <form className="form-grid">
        <div>
          <label>Full Name</label>
          <input type="text" defaultValue="Dr. Sarah Johnson" />
        </div>

        <div>
          <label>Email</label>
          <input type="email" defaultValue="sarah.johnson@email.com" />
        </div>

        <div>
          <label>Institution</label>
          <input type="text" defaultValue="University of Cape Town" />
        </div>

        <div>
          <label>ORCID ID</label>
          <input type="text" defaultValue="0000-0002-1825-0097" />
        </div>

        <button type="submit">Save Changes</button>
      </form>
    </div>
  );
};

export default AuthorProfile;